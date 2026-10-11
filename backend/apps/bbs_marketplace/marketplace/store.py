import json

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import inventory, logistics, mpesa, orders, pricing, variants
from apps.bbs_marketplace.marketplace.utils import buyer_for_user, get_settings

SORTS = {
    "newest": "l.creation desc",
    "price_asc": "l.price asc",
    "price_desc": "l.price desc",
    "popular": "l.is_sponsored desc, l.sold_count desc",
    "rating": "l.rating_average desc, l.rating_count desc",
}


def effective_unit(doc, buyer_type, item_code=None):
    price = pricing.listing_price(doc, doc.min_order_qty or 1, buyer_type, item_code)
    return price, price["unit_price"] - price["discount_per_unit"]


def price_span(doc, buyer_type):
    if not cint(doc.has_variants):
        return None
    amounts = [effective_unit(doc, buyer_type, row.item_code)[1] for row in doc.variants if cint(row.enabled)]
    return (flt(min(amounts), 2), flt(max(amounts), 2)) if amounts else None


def listing_card(row, buyer_type="B2C"):
    doc = frappe.get_doc("Marketplace Listing", row.name if hasattr(row, "name") else row)
    price, unit = effective_unit(doc, buyer_type)
    span = price_span(doc, buyer_type)
    if span:
        unit = span[0]
    return {
        "name": doc.name,
        "slug": doc.slug,
        "title": doc.listing_title,
        "image": doc.primary_image,
        "price": flt(unit, 2),
        "compare_at_price": flt(doc.compare_at_price) or (flt(price["unit_price"]) if price["discount_per_unit"] else None),
        "includes_vat": cint(doc.price_includes_vat),
        "campaign": price["campaign"],
        "rating": flt(doc.rating_average, 2),
        "rating_count": cint(doc.rating_count),
        "seller": doc.seller,
        "seller_name": frappe.db.get_value("Marketplace Seller", doc.seller, "seller_name"),
        "category": doc.item_group,
        "brand": doc.brand,
        "in_stock": inventory.available(doc) > 0 or bool(cint(doc.allow_backorder)),
        "min_order_qty": flt(doc.min_order_qty),
        "free_delivery": cint(doc.free_delivery),
        "has_bulk_pricing": bool(doc.price_tiers),
        "has_variants": bool(cint(doc.has_variants)),
        "price_from": span[0] if span else None,
        "price_to": span[1] if span else None,
        "sponsored": bool(cint(doc.is_sponsored)),
        "digital": bool(cint(doc.is_digital)),
        "wishlist_count": cint(doc.wishlist_count),
    }


def resolve_buyer_type(buyer_type=None):
    customer = buyer_for_user()
    if buyer_type in ("B2B", "B2C"):
        return buyer_type
    if customer:
        return frappe.db.get_value("Customer", customer, "marketplace_buyer_type") or "B2C"
    return "B2C"


def published_filters(buyer_type):
    return ["l.status = 'Published'", "s.status = 'Active'", "coalesce(s.holiday_mode, 0) = 0", f"l.listing_type in ('Both', '{buyer_type}')"]


@frappe.whitelist(allow_guest=True)
def get_categories():
    rows = frappe.get_all(
        "Item Group",
        filters={"marketplace_visible": 1},
        fields=["name", "parent_item_group", "is_group", "marketplace_icon", "marketplace_banner", "marketplace_sort_order"],
        order_by="marketplace_sort_order asc, name asc",
    )
    counts = dict(
        frappe.db.sql('select item_group, count(*) from "tabMarketplace Listing" where status = \'Published\' group by item_group')
    )
    nodes = {row.name: {**row, "listing_count": counts.get(row.name, 0), "children": []} for row in rows}
    roots = []
    for node in nodes.values():
        parent = nodes.get(node["parent_item_group"])
        (parent["children"] if parent else roots).append(node)
    return roots


@frappe.whitelist(allow_guest=True)
def search_listings(query=None, category=None, brand=None, seller=None, min_price=None, max_price=None, min_rating=None, in_stock=None, buyer_type=None, sort="popular", page=1, page_size=24, attributes=None, variant_attributes=None):
    buyer_type = resolve_buyer_type(buyer_type)
    where = published_filters(buyer_type)
    values = []
    if query:
        where.append("(l.listing_title ilike %s or l.search_keywords ilike %s or l.short_description ilike %s)")
        like = f"%{query}%"
        values += [like, like, like]
    if category:
        group = frappe.db.get_value("Item Group", category, ["lft", "rgt"])
        if group and group[0] is not None:
            where.append('l.item_group in (select name from "tabItem Group" where lft >= %s and rgt <= %s)')
            values += [group[0], group[1]]
        else:
            where.append("l.item_group = %s")
            values.append(category)
    if brand:
        where.append("l.brand = %s")
        values.append(brand)
    if seller:
        where.append("l.seller = %s")
        values.append(seller)
    if min_price not in (None, ""):
        where.append("l.price >= %s")
        values.append(flt(min_price))
    if max_price not in (None, ""):
        where.append("l.price <= %s")
        values.append(flt(max_price))
    if min_rating not in (None, ""):
        where.append("l.rating_average >= %s")
        values.append(flt(min_rating))
    if cint(in_stock):
        where.append("(l.available_qty > 0 or l.allow_backorder = 1)")
    if attributes:
        pairs = json.loads(attributes) if isinstance(attributes, str) else attributes
        for key, val in pairs.items():
            where.append('exists (select 1 from "tabListing Attribute" a where a.parent = l.name and a.attribute = %s and a.value = %s)')
            values += [key, val]
    if variant_attributes:
        chosen = json.loads(variant_attributes) if isinstance(variant_attributes, str) else variant_attributes
        for key, picks in chosen.items():
            picks = [picks] if isinstance(picks, str) else list(picks)
            if not picks:
                continue
            marks = ", ".join(["%s"] * len(picks))
            where.append(
                'exists (select 1 from "tabListing Variant" v join "tabItem Variant Attribute" a on a.parent = v.item_code '
                f"where v.parent = l.name and v.enabled = 1 and a.attribute = %s and a.attribute_value in ({marks}))"
            )
            values += [key, *picks]
    clause = " and ".join(where)
    page, page_size = max(1, cint(page)), min(60, max(1, cint(page_size)))
    base = f'from "tabMarketplace Listing" l join "tabMarketplace Seller" s on s.name = l.seller where {clause}'
    total = frappe.db.sql(f"select count(*) {base}", values)[0][0]
    rows = frappe.db.sql(
        f"select l.name {base} order by {SORTS.get(sort, SORTS['popular'])} limit %s offset %s",
        values + [page_size, (page - 1) * page_size],
        as_dict=True,
    )
    facets = {
        "brands": frappe.db.sql(f"select l.brand, count(*) {base} and l.brand is not null and l.brand != '' group by l.brand order by 2 desc limit 20", values),
        "price": frappe.db.sql(f"select min(l.price), max(l.price) {base}", values)[0],
        "categories": frappe.db.sql(f"select l.item_group, count(*) {base} group by l.item_group order by 2 desc limit 30", values),
        "options": frappe.db.sql(
            f"""select a.attribute, a.attribute_value, count(distinct v.parent)
            from "tabListing Variant" v
            join "tabItem Variant Attribute" a on a.parent = v.item_code
            where v.enabled = 1 and v.parent in (select l.name {base})
            group by a.attribute, a.attribute_value order by a.attribute, 3 desc limit 80""",
            values,
        ),
    }
    option_facets = {}
    for attribute, value, count in facets["options"]:
        option_facets.setdefault(attribute, []).append({"value": value, "count": count})
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [listing_card(row, buyer_type) for row in rows],
        "facets": {"brands": [{"brand": b, "count": c} for b, c in facets["brands"]], "price": {"min": facets["price"][0], "max": facets["price"][1]}, "categories": [{"category": g, "count": c} for g, c in facets["categories"]], "options": [{"attribute": key, "values": rows} for key, rows in option_facets.items()]},
    }


@frappe.whitelist(allow_guest=True)
def get_listing(listing=None, slug=None, buyer_type=None):
    name = listing or frappe.db.get_value("Marketplace Listing", {"slug": slug})
    if not name or not frappe.db.exists("Marketplace Listing", name):
        frappe.throw(_("Product not found"), frappe.DoesNotExistError)
    doc = frappe.get_doc("Marketplace Listing", name)
    buyer_type = resolve_buyer_type(buyer_type)
    if doc.status != "Published":
        frappe.throw(_("This product is not available"), frappe.DoesNotExistError)
    frappe.db.set_value("Marketplace Listing", name, "view_count", cint(doc.view_count) + 1, update_modified=False)
    seller = frappe.db.get_value("Marketplace Seller", doc.seller, ["seller_name", "shop_slug", "logo", "rating", "rating_count", "return_policy", "fulfilment_mode"], as_dict=True)
    price = pricing.listing_price(doc, doc.min_order_qty or 1, buyer_type)
    variant_data = variants.storefront(doc, lambda row: flt(effective_unit(doc, buyer_type, row.item_code)[1], 2)) if cint(doc.has_variants) else {"axes": [], "variants": []}
    siblings = []
    if doc.template_item:
        for sibling in frappe.get_all("Marketplace Listing", filters={"template_item": doc.template_item, "status": "Published"}, pluck="name"):
            siblings.append({"listing": sibling, "attributes": [{"attribute": a.attribute, "value": a.value} for a in frappe.get_doc("Marketplace Listing", sibling).attributes]})
    return {
        **listing_card(doc, buyer_type),
        "description": doc.description,
        "short_description": doc.short_description,
        "images": [{"image": row.image, "alt": row.alt_text, "primary": cint(row.is_primary)} for row in doc.images],
        "video_url": doc.video_url,
        "specifications": [{"attribute": row.attribute, "value": row.value} for row in doc.attributes],
        "price_tiers": [{"min_qty": flt(t.min_qty), "price": flt(t.price)} for t in doc.price_tiers if t.buyer_type == buyer_type],
        "price_source": price["source"],
        "vat_rate": flt(doc.vat_rate),
        "available_qty": inventory.available(doc),
        "max_order_qty": flt(doc.max_order_qty),
        "order_multiple": flt(doc.order_multiple),
        "lead_time_days": doc.lead_time_days,
        "cod_allowed": cint(doc.cod_allowed),
        "return_eligible": cint(doc.return_eligible),
        "return_window_days": doc.return_window_days,
        "warranty": doc.warranty,
        "weight_kg": flt(doc.weight_kg),
        "seller_info": seller,
        "options": variant_data["axes"],
        "variants": variant_data["variants"],
        "related_listings": siblings,
        "seo": {"title": doc.seo_title or doc.listing_title, "description": doc.seo_description or doc.short_description},
        "related": [listing_card(row, buyer_type) for row in frappe.get_all("Marketplace Listing", filters={"item_group": doc.item_group, "status": "Published", "name": ["!=", name]}, limit=8)],
    }


@frappe.whitelist(allow_guest=True)
def get_home(buyer_type=None):
    buyer_type = resolve_buyer_type(buyer_type)
    now = now_datetime()
    banners = frappe.get_all(
        "Marketplace Banner",
        filters={"enabled": 1},
        or_filters=[["start_date", "is", "not set"], ["start_date", "<=", now]],
        fields=["name", "title", "placement", "image", "mobile_image", "link_type", "link_value", "end_date", "sort_order"],
        order_by="sort_order asc",
    )
    banners = [b for b in banners if not b.end_date or b.end_date >= now]
    campaigns = frappe.get_all("Marketplace Campaign", filters={"status": "Active"}, fields=["name", "title", "campaign_type", "banner", "end_date"])
    for campaign in campaigns:
        names = frappe.get_all("Campaign Listing", filters={"parent": campaign.name}, pluck="listing", limit=12)
        campaign["listings"] = [listing_card(name, buyer_type) for name in names if frappe.db.get_value("Marketplace Listing", name, "status") == "Published"]
    newest = search_listings(sort="newest", page_size=12, buyer_type=buyer_type)["items"]
    popular = search_listings(sort="popular", page_size=12, buyer_type=buyer_type)["items"]
    return {"banners": banners, "campaigns": campaigns, "categories": get_categories(), "new_arrivals": newest, "best_sellers": popular}


@frappe.whitelist(allow_guest=True)
def get_reviews(listing, page=1, page_size=10):
    rows = frappe.get_all(
        "Product Review",
        filters={"listing": listing, "status": "Published"},
        fields=["name", "customer", "rating", "title", "body", "seller_reply", "verified_purchase", "creation"],
        order_by="creation desc",
        start=(cint(page) - 1) * cint(page_size),
        limit=cint(page_size),
    )
    for row in rows:
        row["customer"] = (frappe.db.get_value("Customer", row["customer"], "customer_name") or "Customer")[:1] + "***"
    histogram = dict(frappe.db.sql('select rating, count(*) from "tabProduct Review" where listing = %s and status = \'Published\' group by rating', listing))
    return {"reviews": rows, "histogram": {str(i): histogram.get(i, 0) for i in range(1, 6)}}


def require_buyer():
    customer = buyer_for_user()
    if not customer:
        frappe.throw(_("Sign in to continue"), frappe.PermissionError)
    return customer


@frappe.whitelist()
def register_buyer(full_name, phone, email=None, buyer_type="B2C", business_name=None, kra_pin=None):
    user = frappe.session.user
    if user in (None, "Guest"):
        frappe.throw(_("Sign in first"), frappe.PermissionError)
    existing = buyer_for_user(user)
    if existing:
        return existing
    group = "Commercial" if buyer_type == "B2B" and frappe.db.exists("Customer Group", "Commercial") else frappe.db.get_value("Customer Group", {"is_group": 0}) or "All Customer Groups"
    customer = frappe.get_doc(
        {
            "doctype": "Customer",
            "customer_name": business_name or full_name,
            "customer_type": "Company" if buyer_type == "B2B" else "Individual",
            "customer_group": group,
            "territory": frappe.db.get_value("Territory", {"is_group": 0}) or "All Territories",
            "tax_id": kra_pin,
            "mobile_no": phone,
            "email_id": email,
            "marketplace_buyer_type": buyer_type,
            "marketplace_user": user,
        }
    )
    customer.flags.ignore_permissions = True
    customer.insert()
    return customer.name


def cart_for(create=True, session_key=None):
    customer = buyer_for_user()
    filters = {"status": "Active"}
    if customer:
        filters["customer"] = customer
    elif session_key:
        filters["session_key"] = session_key
    else:
        frappe.throw(_("Sign in or provide a session key"), frappe.PermissionError)
    name = frappe.db.get_value("Marketplace Cart", filters)
    if name:
        return frappe.get_doc("Marketplace Cart", name)
    if not create:
        return None
    cart = frappe.get_doc({"doctype": "Marketplace Cart", "customer": customer, "session_key": None if customer else session_key, "buyer_type": resolve_buyer_type()})
    cart.flags.ignore_permissions = True
    cart.insert()
    return cart


def cart_payload(cart):
    buyer_type = cart.buyer_type or "B2C"
    lines, subtotal = [], 0.0
    for row in cart.items:
        price = pricing.listing_price(row.listing, row.qty, buyer_type, row.variant_item)
        amounts = pricing.line_amounts(price, row.qty)
        options = frappe.db.get_value("Listing Variant", {"parent": row.listing, "item_code": row.variant_item}, ["options", "image"], as_dict=True) if row.variant_item else None
        image = (options.image if options and options.image else None) or frappe.db.get_value("Marketplace Listing", row.listing, "primary_image")
        lines.append({"name": row.name, "listing": row.listing, "variant": row.variant_item, "options": options.options if options else None, "title": row.item_name, "qty": flt(row.qty), "unit_price": flt(price["unit_price"] - price["discount_per_unit"], 2), "amount": amounts["amount"], "image": image, "seller": row.seller})
        subtotal += amounts["amount"]
    coupon = pricing.apply_coupon(cart.coupon_code, subtotal) if cart.coupon_code else {"discount": 0.0}
    return {"name": cart.name, "buyer_type": buyer_type, "items": lines, "subtotal": flt(subtotal, 2), "discount": coupon["discount"], "coupon_code": cart.coupon_code, "total": flt(subtotal - coupon["discount"], 2)}


def save_cart(cart):
    cart.last_activity = now_datetime()
    cart.flags.ignore_permissions = True
    cart.save()
    return cart_payload(cart)


@frappe.whitelist(allow_guest=True)
def get_cart(session_key=None):
    cart = cart_for(True, session_key)
    return cart_payload(cart)


@frappe.whitelist(allow_guest=True)
def add_to_cart(listing, qty=1, session_key=None, variant=None):
    cart = cart_for(True, session_key)
    doc = frappe.get_doc("Marketplace Listing", listing)
    if doc.status != "Published":
        frappe.throw(_("This product is not available"))
    if cint(doc.has_variants):
        if not variant:
            frappe.throw(_("Choose an option first"))
        variants.row_of(doc, variant)
    else:
        variant = None
    pricing.check_order_limits(doc, qty)
    existing = next((row for row in cart.items if row.listing == listing and (row.variant_item or None) == (variant or None)), None)
    if existing:
        existing.qty = flt(existing.qty) + flt(qty)
        pricing.check_order_limits(doc, existing.qty)
    else:
        cart.append("items", {"listing": listing, "variant_item": variant, "qty": flt(qty)})
    return save_cart(cart)


@frappe.whitelist(allow_guest=True)
def update_cart_item(listing, qty, session_key=None, variant=None):
    cart = cart_for(False, session_key)
    if not cart:
        frappe.throw(_("Your cart is empty"))
    row = next((r for r in cart.items if r.listing == listing and (r.variant_item or None) == (variant or None)), None)
    if not row:
        frappe.throw(_("That product is not in your cart"))
    if flt(qty) <= 0:
        cart.remove(row)
    else:
        pricing.check_order_limits(frappe.get_doc("Marketplace Listing", listing), qty)
        row.qty = flt(qty)
    return save_cart(cart)


@frappe.whitelist(allow_guest=True)
def apply_cart_coupon(code=None, session_key=None):
    cart = cart_for(False, session_key)
    if not cart:
        frappe.throw(_("Your cart is empty"))
    if code:
        pricing.apply_coupon(code, cart_payload(cart)["subtotal"])
    cart.coupon_code = code or None
    return save_cart(cart)


@frappe.whitelist(allow_guest=True)
def get_delivery_options(county=None, town=None, session_key=None, payment_method=None):
    cart = cart_for(False, session_key)
    if not cart or not cart.items:
        frappe.throw(_("Your cart is empty"))
    zone = logistics.zone_for_address(county, town)
    by_seller = {}
    for row in cart.items:
        by_seller.setdefault(row.seller, []).append(row)
    result = []
    total = 0.0
    for seller, rows in by_seller.items():
        weight = logistics.parcel_weight(rows)
        value = sum(flt(r.amount) for r in rows)
        options = logistics.available_options(zone, weight, value, payment_method == "Cash on Delivery")
        best = options[0] if options else None
        total += flt(best["fee"]) if best else 0
        result.append({"seller": seller, "seller_name": frappe.db.get_value("Marketplace Seller", seller, "seller_name"), "weight_kg": weight, "options": options})
    stations = frappe.get_all("Pickup Station", filters={"enabled": 1, "zone": zone}, fields=["name", "station_name", "address", "opening_hours", "county", "latitude", "longitude"])
    return {"zone": zone, "shipments": result, "estimated_total": flt(total, 2), "pickup_stations": stations}


def payment_methods_for(buyer_type, amount):
    out = []
    for row in get_settings().payment_methods:
        if not cint(row.enabled) or row.audience not in ("Both", None, "", buyer_type):
            continue
        if flt(row.min_amount) and flt(amount) < flt(row.min_amount):
            continue
        if flt(row.max_amount) and flt(amount) > flt(row.max_amount):
            continue
        out.append({"method": row.method, "fee_percent": flt(row.fee_percent)})
    return out


@frappe.whitelist()
def get_payment_methods(amount=0):
    return payment_methods_for(resolve_buyer_type(), flt(amount))


@frappe.whitelist()
def place_order(address=None, county=None, town=None, recipient_name=None, recipient_phone=None, payment_method="M-Pesa", delivery_method="Courier Delivery", pickup_station=None, notes=None, purchase_order_no=None, invoice_required=0, source="Website"):
    customer = require_buyer()
    cart = cart_for(False)
    if not cart or not cart.items:
        frappe.throw(_("Your cart is empty"))
    zone = logistics.zone_for_address(county, town)
    snapshot = address
    if address and frappe.db.exists("Address", address):
        snapshot = None
    order = frappe.get_doc(
        {
            "doctype": "Marketplace Order",
            "customer": customer,
            "buyer_type": cart.buyer_type or "B2C",
            "payment_method": payment_method,
            "delivery_method": delivery_method,
            "delivery_zone": zone,
            "shipping_address": address if address and frappe.db.exists("Address", address) else None,
            "address_snapshot": snapshot,
            "recipient_name": recipient_name,
            "recipient_phone": recipient_phone,
            "pickup_station": pickup_station,
            "delivery_notes": notes,
            "purchase_order_no": purchase_order_no,
            "invoice_required": cint(invoice_required),
            "coupon_code": cart.coupon_code,
            "source": source,
            "company": get_settings().company,
            "items": [{"listing": row.listing, "variant_item": row.variant_item, "qty": row.qty} for row in cart.items],
        }
    )
    order.flags.ignore_permissions = True
    order.insert()
    cart.status = "Converted"
    cart.flags.ignore_permissions = True
    cart.save()
    return order_payload(order.name)


@frappe.whitelist()
def pay_order(order, phone=None):
    customer = require_buyer()
    doc = frappe.get_doc("Marketplace Order", order)
    if doc.customer != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    if doc.status != "Pending Payment" or flt(doc.outstanding_amount) <= 0:
        frappe.throw(_("This order does not need a payment"))
    if doc.payment_method == "M-Pesa":
        payment = frappe.get_doc({"doctype": "Marketplace Payment", "marketplace_order": order, "method": "M-Pesa", "amount": doc.outstanding_amount, "phone": phone or doc.recipient_phone, "status": "Initiated", "company": doc.company})
        payment.flags.ignore_permissions = True
        payment.insert()
        payment = mpesa.stk_push(payment.name)
        return {"payment": payment.name, "status": payment.status, "message": _("Check your phone and enter your M-Pesa PIN") if payment.status == "Pending" else payment.failure_reason}
    if doc.payment_method == "Wallet":
        return pay_from_wallet(doc)
    frappe.throw(_("Continue with {0} on the payment page").format(doc.payment_method))


def pay_from_wallet(order):
    from apps.bbs_marketplace.marketplace import accounting, wallet

    seller = frappe.db.get_value("Marketplace Seller", {"customer": order.customer})
    if not seller:
        frappe.throw(_("Only tenants with a seller wallet can pay from a wallet"))
    wallet.require_available(seller, order.outstanding_amount)
    supplier = frappe.db.get_value("Marketplace Seller", seller, "supplier")
    rows = [
        {"account": accounting.setting_account("seller_wallet_account"), "party_type": "Supplier", "party": supplier, "debit_in_account_currency": flt(order.outstanding_amount, 2)},
        {"account": accounting.setting_account("customer_advance_account"), "party_type": "Customer", "party": order.customer, "credit_in_account_currency": flt(order.outstanding_amount, 2)},
    ]
    journal = accounting.make_journal(order.company, frappe.utils.today(), rows, _("Wallet payment for marketplace order {0}").format(order.name), order.name)
    wallet.post_transaction(seller, "Bill Payment", -flt(order.outstanding_amount), reference=("Marketplace Order", order.name), journal_entry=journal, remarks=_("Paid marketplace order {0}").format(order.name))
    payment = frappe.get_doc({"doctype": "Marketplace Payment", "marketplace_order": order.name, "method": "Wallet", "amount": order.outstanding_amount, "status": "Paid", "company": order.company, "paid_on": now_datetime()})
    payment.flags.ignore_permissions = True
    payment.insert()
    orders.apply_payment(order.name)
    return {"payment": payment.name, "status": "Paid"}


def order_payload(name):
    doc = frappe.get_doc("Marketplace Order", name)
    seller_orders = frappe.get_all("Seller Order", filters={"marketplace_order": name}, fields=["name", "seller", "status", "shipment", "items_total", "shipping_fee"])
    for so in seller_orders:
        so["seller_name"] = frappe.db.get_value("Marketplace Seller", so["seller"], "seller_name")
        if so["shipment"]:
            shipment = frappe.db.get_value("Marketplace Shipment", so["shipment"], ["status", "tracking_no", "courier"], as_dict=True)
            so["tracking"] = {**shipment, "url": logistics.tracking_url(shipment.courier, shipment.tracking_no)}
    return {
        "name": doc.name,
        "status": doc.status,
        "payment_status": doc.payment_status,
        "payment_method": doc.payment_method,
        "order_date": doc.order_date,
        "subtotal": doc.subtotal,
        "vat_total": doc.vat_total,
        "discount_total": doc.discount_total,
        "shipping_total": doc.shipping_total,
        "grand_total": doc.grand_total,
        "paid_amount": doc.paid_amount,
        "outstanding_amount": doc.outstanding_amount,
        "items": [{"listing": r.listing, "variant": r.variant_item, "options": r.variant_label, "title": r.item_name, "qty": r.qty, "amount": r.amount, "status": r.status, "image": frappe.db.get_value("Marketplace Listing", r.listing, "primary_image")} for r in doc.items],
        "seller_orders": seller_orders,
        "address": doc.address_snapshot,
        "timeline": [{"status": r.status, "at": r.at, "note": r.note} for r in doc.status_log],
    }


@frappe.whitelist()
def get_order(order):
    customer = require_buyer()
    if frappe.db.get_value("Marketplace Order", order, "customer") != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    return order_payload(order)


@frappe.whitelist()
def get_my_orders(status=None, page=1, page_size=10):
    customer = require_buyer()
    filters = {"customer": customer}
    if status:
        filters["status"] = status
    rows = frappe.get_all("Marketplace Order", filters=filters, fields=["name", "status", "payment_status", "grand_total", "order_date"], order_by="order_date desc", start=(cint(page) - 1) * cint(page_size), limit=cint(page_size))
    return rows


@frappe.whitelist()
def get_payment_status(payment):
    customer = require_buyer()
    doc = frappe.get_doc("Marketplace Payment", payment)
    if doc.customer != customer:
        frappe.throw(_("This is not your payment"), frappe.PermissionError)
    return {"status": doc.status, "receipt": doc.gateway_receipt, "reason": doc.failure_reason}


@frappe.whitelist()
def cancel_my_order(order, reason=None):
    customer = require_buyer()
    if frappe.db.get_value("Marketplace Order", order, "customer") != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    orders.cancel_order(order, reason or _("Cancelled by the buyer"))
    return order_payload(order)


@frappe.whitelist()
def request_return(order, seller_order, reason, items, details=None):
    customer = require_buyer()
    if frappe.db.get_value("Marketplace Order", order, "customer") != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    rows = json.loads(items) if isinstance(items, str) else items
    doc = frappe.get_doc({"doctype": "Return Request", "marketplace_order": order, "seller_order": seller_order, "reason": reason, "details": details, "items": [{"order_item": r["order_item"], "qty": r["qty"]} for r in rows]})
    doc.flags.ignore_permissions = True
    doc.insert()
    return {"name": doc.name, "status": doc.status, "refund_amount": doc.refund_amount}


@frappe.whitelist()
def add_review(listing, rating, title=None, body=None, order=None):
    customer = require_buyer()
    doc = frappe.get_doc({"doctype": "Product Review", "listing": listing, "customer": customer, "rating": cint(rating), "title": title, "body": body, "marketplace_order": order, "status": "Pending"})
    doc.flags.ignore_permissions = True
    doc.insert()
    return doc.name


@frappe.whitelist()
def track_order(order):
    customer = require_buyer()
    if frappe.db.get_value("Marketplace Order", order, "customer") != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    result = []
    for shipment in frappe.get_all("Marketplace Shipment", filters={"marketplace_order": order}, pluck="name"):
        doc = frappe.get_doc("Marketplace Shipment", shipment)
        result.append({"shipment": doc.name, "status": doc.status, "courier": doc.courier, "tracking_no": doc.tracking_no, "url": logistics.tracking_url(doc.courier, doc.tracking_no), "events": [{"status": e.status, "at": e.at, "location": e.location, "note": e.note} for e in doc.events]})
    return result
