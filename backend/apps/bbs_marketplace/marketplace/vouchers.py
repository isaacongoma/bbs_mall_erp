import frappe
from frappe import _
from frappe.utils import cint, flt, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import commission
from apps.bbs_marketplace.marketplace.utils import get_settings

NOT_CANCELLED = ["not in", ["Cancelled", "Failed"]]


def find(code):
    code = (code or "").strip()
    if not code:
        return None
    if frappe.db.exists("Coupon Code", code):
        return code
    return frappe.db.get_value("Coupon Code", {"coupon_code": code.upper()}) or frappe.db.get_value("Coupon Code", {"coupon_code": code})


def is_voucher(doc):
    return bool(cint(doc.get("voucher_marketplace")))


def validate_coupon(doc, method=None):
    if not is_voucher(doc):
        return
    settings = get_settings()
    doc.coupon_type = "Promotional"
    doc.from_external_ecomm_platform = 1
    doc.coupon_code = (doc.coupon_code or doc.coupon_name or "").strip().upper().replace(" ", "")
    if not doc.coupon_code:
        frappe.throw(_("Enter the voucher code"))
    other = frappe.db.get_value("Coupon Code", {"coupon_code": doc.coupon_code, "name": ["!=", doc.name or ""]})
    if other:
        frappe.throw(_("The code {0} is already used by {1}").format(doc.coupon_code, other))
    if not doc.valid_upto:
        frappe.throw(_("Valid Until is required for a voucher"))
    doc.valid_from = doc.valid_from or today()
    if getdate(doc.valid_upto) < getdate(doc.valid_from):
        frappe.throw(_("Valid Until must be after Valid From"))
    if flt(doc.voucher_discount_value) <= 0:
        frappe.throw(_("Enter the discount value"))
    percent = doc.voucher_discount_type != "Fixed Amount"
    if percent and flt(doc.voucher_discount_value) > 100:
        frappe.throw(_("A percentage cannot be above 100"))
    if doc.voucher_applies_to == "Category" and not doc.voucher_item_group:
        frappe.throw(_("Choose the category"))
    if doc.voucher_applies_to == "Brand" and not doc.voucher_brand:
        frappe.throw(_("Choose the brand"))
    if doc.voucher_applies_to == "Selected Products":
        if not doc.voucher_products:
            frappe.throw(_("Add the products this voucher applies to"))
        for row in doc.voucher_products:
            owner = frappe.db.get_value("Marketplace Listing", row.listing, "seller")
            if doc.marketplace_seller and owner != doc.marketplace_seller:
                frappe.throw(_("Row {0}: {1} belongs to another seller").format(row.idx, row.listing))
    if doc.marketplace_seller:
        if frappe.db.get_value("Marketplace Seller", doc.marketplace_seller, "status") != "Active":
            frappe.throw(_("The seller is not active"))
        cap = flt(settings.seller_voucher_max_percent)
        if percent and cap and doc.voucher_type != "Delivery Discount" and flt(doc.voucher_discount_value) > cap:
            frappe.throw(_("Sellers can offer up to {0}% off").format(cap))
        if cint(settings.require_voucher_approval) and doc.is_new() and "Marketplace Manager" not in frappe.get_roles() and "System Manager" not in frappe.get_roles():
            doc.voucher_status = "Pending Approval"
    doc.voucher_status = doc.voucher_status or "Active"


def row_info(rows, doc_for_rows=None):
    result = []
    for key, row in enumerate(rows):
        listing = row["listing"]
        group, brand = frappe.db.get_value("Marketplace Listing", listing, ["item_group", "brand"])
        result.append({**row, "key": row.get("key", key), "item_group": group, "brand": brand})
    return result


def eligible_rows(voucher, rows):
    scope = voucher.voucher_applies_to or "All Items"
    groups_cache = {}
    picked = {row.listing for row in voucher.get("voucher_products") or []}
    found = []
    for row in rows:
        if voucher.marketplace_seller and row["seller"] != voucher.marketplace_seller:
            continue
        if cint(voucher.voucher_exclude_campaign_items) and row.get("on_campaign"):
            continue
        if scope == "Selected Products" and row["listing"] not in picked:
            continue
        if scope == "Brand" and row.get("brand") != voucher.voucher_brand:
            continue
        if scope == "Category":
            chain = groups_cache.setdefault(row.get("item_group"), commission.item_group_chain(row.get("item_group")))
            if voucher.voucher_item_group not in chain:
                continue
        found.append(row)
    return found


def has_prior_orders(customer, exclude=None):
    filters = {"customer": customer, "status": NOT_CANCELLED}
    if exclude:
        filters["name"] = ["!=", exclude]
    return bool(frappe.db.exists("Marketplace Order", filters))


def used_count(voucher, customer=None, exclude_order=None):
    filters = {"voucher": voucher, "status": "Applied"}
    if customer:
        filters["customer"] = customer
    if exclude_order:
        filters["marketplace_order"] = ["!=", exclude_order]
    return frappe.db.count("Marketplace Voucher Redemption", filters)


def check_usable(voucher, customer, buyer_type, payment_method, order_name=None, collecting=False):
    code = voucher.coupon_code or voucher.name
    if voucher.voucher_status != "Active":
        frappe.throw(_("Voucher {0} is not active").format(code))
    now = getdate(today())
    if voucher.valid_from and getdate(voucher.valid_from) > now:
        frappe.throw(_("Voucher {0} starts on {1}").format(code, voucher.valid_from))
    if voucher.valid_upto and getdate(voucher.valid_upto) < now:
        frappe.throw(_("Voucher {0} expired on {1}").format(code, voucher.valid_upto))
    if voucher.voucher_buyer_type not in (None, "", "Both", buyer_type):
        frappe.throw(_("Voucher {0} is for {1} buyers").format(code, voucher.voucher_buyer_type))
    if voucher.voucher_payment_method and payment_method and voucher.voucher_payment_method != payment_method:
        frappe.throw(_("Voucher {0} only works when paying with {1}").format(code, voucher.voucher_payment_method))
    if cint(voucher.maximum_use) and used_count(voucher.name, exclude_order=order_name) >= cint(voucher.maximum_use):
        frappe.throw(_("Voucher {0} has been fully used").format(code))
    if customer:
        limit = cint(voucher.voucher_per_customer_limit)
        if limit and used_count(voucher.name, customer, order_name) >= limit:
            frappe.throw(_("You have already used voucher {0}").format(code))
        if cint(voucher.voucher_first_order_only) and has_prior_orders(customer, order_name):
            frappe.throw(_("Voucher {0} is for new customers only").format(code))
        if cint(voucher.voucher_must_collect) and not collecting and not frappe.db.exists("Marketplace Voucher Claim", {"voucher": voucher.name, "customer": customer}):
            frappe.throw(_("Collect voucher {0} first").format(code))
    elif cint(voucher.voucher_must_collect) or cint(voucher.voucher_first_order_only):
        frappe.throw(_("Sign in to use voucher {0}").format(code))


def spread(total, rows):
    base = sum(flt(row["amount"]) for row in rows)
    lines, left = {}, flt(total, 2)
    for index, row in enumerate(rows):
        share = flt(total * flt(row["amount"]) / base, 2) if index < len(rows) - 1 and base else left
        share = max(0.0, min(share, flt(row["amount"]), left))
        lines[row["key"]] = share
        left = flt(left - share, 2)
    return lines


def legacy_discount(coupon, total):
    rule = frappe.get_doc("Pricing Rule", coupon.pricing_rule) if coupon.pricing_rule else None
    if not rule or rule.disable:
        frappe.throw(_("Coupon {0} is not active").format(coupon.name))
    today_date = now_datetime().date()
    if coupon.valid_from and coupon.valid_from > today_date:
        frappe.throw(_("Coupon {0} is not valid yet").format(coupon.name))
    if coupon.valid_upto and coupon.valid_upto < today_date:
        frappe.throw(_("Coupon {0} has expired").format(coupon.name))
    if coupon.maximum_use and cint(coupon.used) >= cint(coupon.maximum_use):
        frappe.throw(_("Coupon {0} has been used up").format(coupon.name))
    if flt(rule.min_amt) and flt(total) < flt(rule.min_amt):
        frappe.throw(_("Spend at least {0} to use this coupon").format(flt(rule.min_amt)))
    if rule.rate_or_discount == "Discount Percentage":
        discount = flt(total) * flt(rule.discount_percentage) / 100.0
    elif rule.rate_or_discount == "Discount Amount":
        discount = flt(rule.discount_amount)
    else:
        discount = 0.0
    if flt(rule.max_amt):
        discount = min(discount, flt(rule.max_amt))
    return flt(min(discount, total), 2)


def evaluate(code, rows, customer=None, buyer_type="B2C", payment_method=None, order_name=None):
    empty = {"voucher": None, "discount": 0.0, "lines": {}, "seller": None, "delivery": False}
    if not code:
        return empty
    name = find(code)
    if not name:
        frappe.throw(_("Voucher {0} does not exist").format(code))
    voucher = frappe.get_doc("Coupon Code", name)
    rows = row_info(rows)
    if not is_voucher(voucher):
        total = flt(sum(flt(row["amount"]) for row in rows), 2)
        discount = legacy_discount(voucher, total)
        return {"voucher": name, "discount": discount, "lines": spread(discount, rows) if discount else {}, "seller": voucher.get("marketplace_seller"), "delivery": False, "legacy": True}
    check_usable(voucher, customer, buyer_type, payment_method, order_name)
    eligible = eligible_rows(voucher, rows)
    if not eligible:
        frappe.throw(_("Voucher {0} does not apply to anything in your cart").format(voucher.coupon_code))
    eligible_total = flt(sum(flt(row["amount"]) for row in eligible), 2)
    if flt(voucher.voucher_min_order) and eligible_total < flt(voucher.voucher_min_order):
        frappe.throw(_("Spend {0} more on eligible items to use voucher {1}").format(flt(flt(voucher.voucher_min_order) - eligible_total, 2), voucher.coupon_code))
    delivery = voucher.voucher_type == "Delivery Discount"
    if delivery:
        return {"voucher": name, "discount": 0.0, "lines": {}, "seller": voucher.get("marketplace_seller"), "delivery": True}
    if voucher.voucher_discount_type == "Fixed Amount":
        discount = flt(voucher.voucher_discount_value)
    else:
        discount = eligible_total * flt(voucher.voucher_discount_value) / 100.0
        if flt(voucher.voucher_max_discount):
            discount = min(discount, flt(voucher.voucher_max_discount))
    discount = flt(min(discount, eligible_total), 2)
    return {"voucher": name, "discount": discount, "lines": spread(discount, eligible), "seller": voucher.get("marketplace_seller"), "delivery": False}


def delivery_discounts(code, fees):
    if not code:
        return {}
    name = find(code)
    if not name:
        return {}
    voucher = frappe.get_doc("Coupon Code", name)
    if not is_voucher(voucher) or voucher.voucher_type != "Delivery Discount":
        return {}
    cap = flt(voucher.voucher_max_discount)
    left = cap if cap else None
    result = {}
    for seller, fee in fees.items():
        if voucher.marketplace_seller and seller != voucher.marketplace_seller:
            continue
        if voucher.voucher_discount_type == "Fixed Amount":
            amount = min(flt(fee), flt(voucher.voucher_discount_value))
        else:
            amount = flt(fee) * flt(voucher.voucher_discount_value) / 100.0
        if left is not None:
            amount = min(amount, left)
            left -= amount
        amount = flt(min(amount, flt(fee)), 2)
        if amount > 0:
            result[seller] = amount
    return result


def record(order):
    if not order.coupon_code:
        return None
    discount = flt(sum(flt(row.voucher_discount) for row in order.items), 2)
    shipping = flt(order.shipping_discount, 2)
    voucher = frappe.get_doc("Coupon Code", order.coupon_code)
    if not discount and not shipping and not is_voucher(voucher):
        discount = flt(order.platform_discount) + flt(order.seller_discount)
    doc = frappe.get_doc(
        {
            "doctype": "Marketplace Voucher Redemption",
            "voucher": order.coupon_code,
            "customer": order.customer,
            "marketplace_order": order.name,
            "status": "Applied",
            "seller": voucher.get("marketplace_seller"),
            "discount_amount": discount,
            "shipping_discount": shipping,
            "redeemed_on": now_datetime(),
        }
    )
    doc.flags.ignore_permissions = True
    doc.insert()
    refresh_totals(order.coupon_code)
    return doc.name


def release(order_name):
    names = frappe.get_all("Marketplace Voucher Redemption", filters={"marketplace_order": order_name, "status": "Applied"}, pluck="name")
    vouchers = set()
    for name in names:
        vouchers.add(frappe.db.get_value("Marketplace Voucher Redemption", name, "voucher"))
        frappe.db.set_value("Marketplace Voucher Redemption", name, "status", "Released", update_modified=False)
    for voucher in vouchers:
        refresh_totals(voucher)


def refresh_totals(voucher):
    row = frappe.db.sql(
        'select count(*), coalesce(sum(discount_amount + shipping_discount), 0) from "tabMarketplace Voucher Redemption" where voucher = %s and status = \'Applied\'',
        voucher,
    )[0]
    frappe.db.set_value("Coupon Code", voucher, {"used": cint(row[0]), "voucher_total_discount": flt(row[1], 2)}, update_modified=False)


def card(voucher, customer=None):
    claimed = bool(customer and frappe.db.exists("Marketplace Voucher Claim", {"voucher": voucher.name, "customer": customer}))
    if voucher.voucher_type == "Delivery Discount":
        headline = _("Free delivery") if voucher.voucher_discount_type != "Fixed Amount" and flt(voucher.voucher_discount_value) >= 100 else _("Delivery discount")
    elif voucher.voucher_discount_type == "Fixed Amount":
        headline = _("KSh {0} off").format(f"{flt(voucher.voucher_discount_value):,.0f}")
    else:
        headline = _("{0}% off").format(f"{flt(voucher.voucher_discount_value):g}")
    return {
        "name": voucher.name,
        "code": voucher.coupon_code,
        "headline": headline,
        "description": voucher.description,
        "min_spend": flt(voucher.voucher_min_order),
        "max_discount": flt(voucher.voucher_max_discount),
        "valid_from": voucher.valid_from,
        "valid_until": voucher.valid_upto,
        "applies_to": voucher.voucher_applies_to,
        "seller": voucher.get("marketplace_seller"),
        "must_collect": cint(voucher.voucher_must_collect),
        "new_customers_only": cint(voucher.voucher_first_order_only),
        "claimed": claimed,
        "remaining": max(0, cint(voucher.maximum_use) - cint(voucher.used)) if cint(voucher.maximum_use) else None,
    }


def public_filters(extra=None):
    filters = {"voucher_marketplace": 1, "voucher_status": "Active", "voucher_show_on_shop": 1, "valid_upto": [">=", getdate(today())]}
    filters.update(extra or {})
    return filters


@frappe.whitelist(allow_guest=True)
def get_vouchers(seller=None, listing=None):
    customer = frappe.db.get_value("Customer", {"marketplace_user": frappe.session.user}) if frappe.session.user != "Guest" else None
    filters = public_filters({"marketplace_seller": seller} if seller else None)
    names = frappe.get_all("Coupon Code", filters=filters, pluck="name", order_by="valid_upto asc")
    result = []
    for name in names:
        voucher = frappe.get_doc("Coupon Code", name)
        if cint(voucher.maximum_use) and cint(voucher.used) >= cint(voucher.maximum_use):
            continue
        if listing:
            owner = frappe.db.get_value("Marketplace Listing", listing, "seller")
            if voucher.marketplace_seller and voucher.marketplace_seller != owner:
                continue
            row = row_info([{"listing": listing, "seller": owner, "amount": 0}])
            if not eligible_rows(voucher, row):
                continue
        result.append(card(voucher, customer))
    return result


@frappe.whitelist()
def claim_voucher(code):
    from apps.bbs_marketplace.marketplace import store

    customer = store.require_buyer()
    name = find(code)
    if not name:
        frappe.throw(_("Voucher {0} does not exist").format(code))
    voucher = frappe.get_doc("Coupon Code", name)
    if not is_voucher(voucher):
        frappe.throw(_("This voucher cannot be collected"))
    check_usable(voucher, customer, "B2B" if frappe.db.get_value("Customer", customer, "marketplace_buyer_type") == "B2B" else "B2C", None, collecting=True)
    if not frappe.db.exists("Marketplace Voucher Claim", {"voucher": name, "customer": customer}):
        doc = frappe.get_doc({"doctype": "Marketplace Voucher Claim", "voucher": name, "customer": customer, "claimed_on": now_datetime()})
        doc.flags.ignore_permissions = True
        doc.insert()
    return card(voucher, customer)


@frappe.whitelist()
def get_my_vouchers():
    from apps.bbs_marketplace.marketplace import store

    customer = store.require_buyer()
    names = frappe.get_all("Marketplace Voucher Claim", filters={"customer": customer}, pluck="voucher")
    result = []
    for name in dict.fromkeys(names):
        voucher = frappe.get_doc("Coupon Code", name)
        item = card(voucher, customer)
        expired = voucher.valid_upto and getdate(voucher.valid_upto) < getdate(today())
        used = bool(cint(voucher.voucher_per_customer_limit)) and used_count(name, customer) >= cint(voucher.voucher_per_customer_limit)
        item["state"] = "Expired" if expired else "Used" if used else "Available"
        result.append(item)
    return result
