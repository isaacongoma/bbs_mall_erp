import base64
import functools
import json
import re

import frappe
from frappe import _
from frappe.utils import add_days, cint, flt, getdate, today

from apps.bbs_marketplace.marketplace import wallet
from apps.bbs_marketplace.marketplace import engagement, plans, utils, variants
from apps.bbs_marketplace.marketplace.utils import get_settings, seller_for_user

LISTING_EDITABLE = (
    "listing_title",
    "listing_type",
    "item_group",
    "brand",
    "short_description",
    "description",
    "video_url",
    "search_keywords",
    "price",
    "compare_at_price",
    "price_includes_vat",
    "vat_rate",
    "min_order_qty",
    "max_order_qty",
    "order_multiple",
    "lead_time_days",
    "stock_qty",
    "low_stock_threshold",
    "allow_backorder",
    "weight_kg",
    "length_cm",
    "width_cm",
    "height_cm",
    "is_fragile",
    "cod_allowed",
    "free_delivery",
    "return_eligible",
    "return_window_days",
    "warranty",
    "is_digital",
    "download_limit",
)

MAX_IMAGE_BYTES = 6 * 1024 * 1024
MAX_DIGITAL_BYTES = 50 * 1024 * 1024

SELLER_ORDER_ACTIONS = {
    "accept": ("New",),
    "pack": ("Accepted",),
    "ship": ("Packed",),
    "deliver": ("Shipped",),
}


def actor():
    return frappe.flags.get("portal_user") or frappe.session.user


def current_seller(active=True):
    return utils.require_seller(actor(), active=active)


def privileged(function):
    @functools.wraps(function)
    def run(*args, **kwargs):
        user = actor()
        previous = frappe.flags.get("portal_user")
        frappe.flags.portal_user = user
        frappe.set_user("Administrator")
        try:
            return function(*args, **kwargs)
        finally:
            frappe.set_user(user)
            frappe.flags.portal_user = previous

    return run


def customer_of(seller):
    return frappe.db.get_value("Marketplace Seller", seller, "customer")


def as_list(value):
    if isinstance(value, str):
        return json.loads(value or "[]")
    return value or []


def as_dict(value):
    if isinstance(value, str):
        return json.loads(value or "{}")
    return value or {}


def owned(doctype, name, seller, field="seller"):
    if frappe.db.get_value(doctype, name, field) != seller:
        frappe.throw(_("This record belongs to another seller"), frappe.PermissionError)
    return frappe.get_doc(doctype, name)


def system(doc):
    doc.flags.ignore_permissions = True
    return doc


@frappe.whitelist()
def get_seller_context():
    user = actor()
    seller = seller_for_user(user)
    customer = None
    if not seller:
        rows = frappe.get_all("Tenant Portal User", filters={"user": user, "parenttype": "Customer"}, fields=["parent"], limit=1)
        customer = rows[0].parent if rows else None
        return {"seller": None, "can_apply": bool(customer), "customer": customer}
    values = frappe.db.get_value(
        "Marketplace Seller",
        seller,
        ["name", "seller_name", "status", "kyc_status", "fulfilment_mode", "holiday_mode", "rating", "shop_slug", "logo", "customer", "vat_registered"],
        as_dict=True,
    )
    settings = get_settings()
    values.update({"currency": frappe.get_cached_value("Company", settings.company, "default_currency"), "min_withdrawal": flt(settings.min_withdrawal), "hold_days": cint(settings.hold_days_after_delivery)})
    return {"seller": values, "can_apply": False, "customer": values.customer}


@frappe.whitelist()
@privileged
def apply_as_seller(seller_name, contact_phone=None, contact_email=None, description=None, kra_pin=None, vat_registered=0, tagline=None):
    user = actor()
    if seller_for_user(user):
        frappe.throw(_("You already have a seller account"))
    rows = frappe.get_all("Tenant Portal User", filters={"user": user, "parenttype": "Customer"}, fields=["parent", "access_level"], limit=1)
    if not rows:
        frappe.throw(_("Only tenants can open a shop"), frappe.PermissionError)
    doc = system(
        frappe.get_doc(
            {
                "doctype": "Marketplace Seller",
                "seller_name": seller_name,
                "customer": rows[0].parent,
                "status": "Pending Approval",
                "kyc_status": "Pending",
                "contact_phone": contact_phone,
                "contact_email": contact_email or user,
                "description": description,
                "tagline": tagline,
                "kra_pin": kra_pin,
                "vat_registered": cint(vat_registered),
            }
        )
    )
    doc.insert()
    return doc.name


@frappe.whitelist()
def get_dashboard():
    seller = current_seller(active=False)
    balances = wallet.balances(seller)
    month_start = today()[:8] + "01"
    stats = frappe.db.sql(
        """
        select
          count(*) filter (where status = 'New') as new_orders,
          count(*) filter (where status in ('Accepted', 'Packed')) as to_ship,
          count(*) filter (where status = 'Shipped') as in_transit,
          coalesce(sum(items_total + vat_total) filter (where creation::date >= %s and status <> 'Cancelled'), 0) as month_sales,
          coalesce(sum(seller_net) filter (where settlement_status = 'Held'), 0) as awaiting_release
        from "tabSeller Order" where seller = %s
        """,
        (month_start, seller),
        as_dict=True,
    )[0]
    listings = frappe.db.sql(
        """
        select count(*) filter (where status = 'Published') as live,
               count(*) filter (where status = 'Pending Approval') as in_review,
               count(*) filter (where status = 'Published' and available_qty <= low_stock_threshold) as low_stock
        from "tabMarketplace Listing" where seller = %s
        """,
        (seller,),
        as_dict=True,
    )[0]
    series = frappe.db.sql(
        """
        select to_char(date_trunc('month', creation), 'YYYY-MM') as month, coalesce(sum(items_total + vat_total), 0) as sales
        from "tabSeller Order"
        where seller = %s and status <> 'Cancelled' and creation >= date_trunc('month', now()) - interval '5 months'
        group by 1 order by 1
        """,
        (seller,),
        as_dict=True,
    )
    return {"wallet": balances, "orders": stats, "listings": listings, "series": series}


@frappe.whitelist()
def get_listings(status=None, search=None, start=0, page_length=20):
    seller = current_seller(active=False)
    filters = {"seller": seller}
    if status:
        filters["status"] = status
    or_filters = [["listing_title", "like", f"%{search}%"], ["name", "like", f"%{search}%"]] if search else None
    rows = frappe.get_all(
        "Marketplace Listing",
        filters=filters,
        or_filters=or_filters,
        fields=["name", "listing_title", "item", "status", "listing_type", "price", "compare_at_price", "stock_qty", "reserved_qty", "available_qty", "primary_image", "sold_count", "rating_average", "item_group", "moderation_notes"],
        order_by="modified desc",
        start=cint(start),
        page_length=cint(page_length),
    )
    return {"rows": rows, "total": frappe.db.count("Marketplace Listing", filters)}


@frappe.whitelist()
def get_listing(name):
    seller = current_seller(active=False)
    doc = owned("Marketplace Listing", name, seller)
    data = doc.as_dict()
    return {key: data.get(key) for key in (*LISTING_EDITABLE, "name", "item", "status", "stock_mode", "images", "price_tiers", "attributes", "digital_files", "variants", "variant_axes", "has_variants", "moderation_notes", "available_qty", "reserved_qty", "primary_image")}


@frappe.whitelist()
@privileged
def save_listing(values, name=None):
    seller = current_seller()
    values = as_dict(values)
    if name:
        doc = owned("Marketplace Listing", name, seller)
        if doc.status not in ("Draft", "Rejected", "Paused", "Published", "Approved"):
            frappe.throw(_("A listing in {0} cannot be edited").format(doc.status))
    else:
        item = make_item(seller, values)
        doc = frappe.new_doc("Marketplace Listing")
        doc.update({"seller": seller, "item": item, "status": "Draft", "warehouse": frappe.db.get_value("Marketplace Seller", seller, "warehouse")})
    for field in LISTING_EDITABLE:
        if field in values and values[field] is not None:
            doc.set(field, values[field])
    for table, fields in (("images", ("image", "alt_text", "is_primary", "sort_order")), ("price_tiers", ("min_qty", "price", "buyer_type")), ("attributes", ("attribute", "value", "filterable")), ("digital_files", ("title", "file", "version"))):
        if table in values:
            doc.set(table, [])
            for row in as_list(values[table]):
                doc.append(table, {field: row.get(field) for field in fields if field in row})
    if "variants" in values:
        apply_variant_edits(doc, as_list(values["variants"]))
    system(doc).save()
    sync_item(doc)
    return doc.name


def make_item(seller, values):
    settings = get_settings()
    abbr = frappe.db.get_value("Marketplace Seller", seller, "shop_slug") or seller
    sequence = frappe.db.count("Item", {"marketplace_seller": seller}) + 1
    code = f"{abbr[:12].upper()}-{sequence:05d}"
    while frappe.db.exists("Item", code):
        sequence += 1
        code = f"{abbr[:12].upper()}-{sequence:05d}"
    item = system(
        frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": code,
                "item_name": values.get("listing_title") or code,
                "item_group": values.get("item_group") or frappe.db.get_value("Item Group", {"is_group": 0}),
                "stock_uom": values.get("stock_uom") or "Nos",
                "is_stock_item": 1,
                "is_sales_item": 1,
                "brand": values.get("brand"),
                "description": values.get("short_description") or values.get("listing_title"),
                "standard_rate": flt(values.get("price")),
                "marketplace_seller": seller,
            }
        )
    )
    item.insert()
    return item.name


def sync_item(listing):
    frappe.db.set_value(
        "Item",
        listing.item,
        {"item_name": listing.listing_title, "item_group": listing.item_group, "brand": listing.brand, "standard_rate": flt(listing.price)},
        update_modified=False,
    )


def move_listing(name, status):
    seller = current_seller()
    doc = owned("Marketplace Listing", name, seller)
    doc.status = status
    system(doc).save()
    return doc.status


@frappe.whitelist()
@privileged
def submit_listing(name):
    doc = frappe.get_doc("Marketplace Listing", name)
    if not doc.images:
        frappe.throw(_("Add at least one product photo before submitting"))
    return move_listing(name, "Pending Approval")


@frappe.whitelist()
@privileged
def pause_listing(name):
    return move_listing(name, "Paused")


@frappe.whitelist()
@privileged
def resume_listing(name):
    return move_listing(name, "Published")


@frappe.whitelist()
@privileged
def archive_listing(name):
    return move_listing(name, "Archived")


@frappe.whitelist()
@privileged
def adjust_stock(name, quantity, variant=None):
    seller = current_seller()
    doc = owned("Marketplace Listing", name, seller)
    if doc.stock_mode != "Seller Managed Quantity":
        frappe.throw(_("Stock for this listing is controlled by the warehouse"))
    if doc.has_variants:
        row = variants.row_of(doc, variant, require=False)
        if row is None:
            frappe.throw(_("Choose which option to update"))
        if flt(quantity) < flt(row.reserved_qty):
            frappe.throw(_("Stock cannot go below the {0} units already reserved").format(flt(row.reserved_qty)))
        row.stock_qty = flt(quantity)
    else:
        if flt(quantity) < flt(doc.reserved_qty):
            frappe.throw(_("Stock cannot go below the {0} units already reserved").format(flt(doc.reserved_qty)))
        doc.stock_qty = flt(quantity)
    system(doc).save()
    return doc.available_qty


@frappe.whitelist()
def get_categories():
    return frappe.get_all("Item Group", filters={"is_group": 0}, fields=["name"], order_by="name", pluck="name")


@frappe.whitelist()
def get_orders(status=None, start=0, page_length=20):
    seller = current_seller(active=False)
    filters = {"seller": seller}
    if status:
        filters["status"] = status
    rows = frappe.get_all(
        "Seller Order",
        filters=filters,
        fields=["name", "marketplace_order", "status", "settlement_status", "items_total", "vat_total", "shipping_fee", "commission_amount", "commission_vat", "seller_net", "customer", "sla_due", "creation", "shipment"],
        order_by="creation desc",
        start=cint(start),
        page_length=cint(page_length),
    )
    return {"rows": rows, "total": frappe.db.count("Seller Order", filters)}


@frappe.whitelist()
def get_order(name):
    seller = current_seller(active=False)
    doc = owned("Seller Order", name, seller)
    order = frappe.db.get_value("Marketplace Order", doc.marketplace_order, ["recipient_name", "recipient_phone", "address_snapshot", "delivery_method", "payment_method", "payment_status", "order_date", "delivery_notes"], as_dict=True)
    shipment = None
    if doc.shipment:
        shipment = frappe.db.get_value("Marketplace Shipment", doc.shipment, ["name", "status", "tracking_no", "courier"], as_dict=True)
    return {"order": doc.as_dict(), "buyer": order, "shipment": shipment}


@frappe.whitelist()
@privileged
def order_action(name, action, tracking_no=None, courier=None, reason=None):
    seller = current_seller()
    doc = system(owned("Seller Order", name, seller))
    if action == "cancel":
        doc.cancel_order(reason or _("Cancelled by seller"))
        return doc.status
    allowed = SELLER_ORDER_ACTIONS.get(action)
    if not allowed:
        frappe.throw(_("Unknown action"))
    if doc.status not in allowed:
        frappe.throw(_("This order cannot be moved from {0}").format(doc.status))
    if action == "accept":
        doc.accept()
    elif action == "pack":
        doc.mark_packed(courier=courier)
    elif action == "ship":
        doc.mark_shipped(tracking_no=tracking_no)
    elif action == "deliver":
        doc.mark_delivered()
    doc.reload()
    return doc.status


@frappe.whitelist()
def get_returns(start=0, page_length=20):
    seller = current_seller(active=False)
    return frappe.get_all(
        "Return Request",
        filters={"seller": seller},
        fields=["name", "marketplace_order", "seller_order", "status", "reason", "resolution", "refund_amount", "creation", "seller_liable"],
        order_by="creation desc",
        start=cint(start),
        page_length=cint(page_length),
    )


@frappe.whitelist()
def get_wallet(from_date=None, to_date=None, transaction_type=None, start=0, page_length=30):
    seller = current_seller(active=False)
    filters = {"seller": seller}
    if transaction_type:
        filters["transaction_type"] = transaction_type
    if from_date and to_date:
        filters["posting_date"] = ["between", [from_date, f"{to_date} 23:59:59"]]
    rows = frappe.get_all(
        "Seller Wallet Transaction",
        filters=filters,
        fields=["name", "posting_date", "transaction_type", "amount", "status", "available_on", "balance_after", "reference_doctype", "reference_name", "remarks"],
        order_by="posting_date desc, creation desc",
        start=cint(start),
        page_length=cint(page_length),
    )
    settings = get_settings()
    return {
        "balances": wallet.balances(seller),
        "rows": rows,
        "total": frappe.db.count("Seller Wallet Transaction", filters),
        "min_withdrawal": flt(settings.min_withdrawal),
        "kyc_status": frappe.db.get_value("Marketplace Seller", seller, "kyc_status"),
    }


@frappe.whitelist()
def get_payout_accounts():
    seller = current_seller(active=False)
    doc = frappe.get_doc("Marketplace Seller", seller)
    return [row.as_dict() for row in doc.payout_accounts]


@frappe.whitelist()
@privileged
def add_payout_account(method, mpesa_number=None, account_holder=None, bank_account=None, account_label=None, is_default=0):
    seller = current_seller(active=False)
    doc = frappe.get_doc("Marketplace Seller", seller)
    if cint(is_default):
        for row in doc.payout_accounts:
            row.is_default = 0
    doc.append(
        "payout_accounts",
        {"method": method, "mpesa_number": mpesa_number, "account_holder": account_holder or doc.seller_name, "bank_account": bank_account, "account_label": account_label, "is_default": cint(is_default) or int(not doc.payout_accounts), "verified": 0},
    )
    system(doc).save()
    return [row.as_dict() for row in doc.payout_accounts]


@frappe.whitelist()
@privileged
def remove_payout_account(row_name):
    seller = current_seller(active=False)
    doc = frappe.get_doc("Marketplace Seller", seller)
    doc.payout_accounts = [row for row in doc.payout_accounts if row.name != row_name]
    if doc.payout_accounts and not any(cint(row.is_default) for row in doc.payout_accounts):
        doc.payout_accounts[0].is_default = 1
    system(doc).save()
    return [row.as_dict() for row in doc.payout_accounts]


@frappe.whitelist()
def get_withdrawals(start=0, page_length=20):
    seller = current_seller(active=False)
    return frappe.get_all(
        "Seller Withdrawal",
        filters={"seller": seller},
        fields=["name", "amount", "fee", "net_amount", "status", "method", "requested_on", "processed_on", "receipt_no", "failure_reason", "account_holder", "mpesa_number"],
        order_by="creation desc",
        start=cint(start),
        page_length=cint(page_length),
    )


@frappe.whitelist()
@privileged
def request_withdrawal(amount, payout_account=None):
    seller = current_seller()
    account = None
    doc = frappe.get_doc("Marketplace Seller", seller)
    if payout_account:
        account = next((row for row in doc.payout_accounts if row.name == payout_account), None)
    else:
        account = next((row for row in doc.payout_accounts if cint(row.is_default)), None) or (doc.payout_accounts[0] if doc.payout_accounts else None)
    if not account:
        frappe.throw(_("Add a payout account first"))
    withdrawal = system(frappe.get_doc({"doctype": "Seller Withdrawal", "seller": seller, "amount": flt(amount), "method": account.method, "payout_account": account.name}))
    withdrawal.insert()
    return {"name": withdrawal.name, "status": withdrawal.status, "net_amount": withdrawal.net_amount, "fee": withdrawal.fee}


@frappe.whitelist()
def get_open_bills():
    seller = current_seller(active=False)
    customer = customer_of(seller)
    invoices = frappe.db.sql(
        """
        select si.name, si.posting_date, si.due_date, si.grand_total, si.outstanding_amount, si.currency,
               coalesce(nullif(si.remarks, ''), si.title) as description,
               case when coalesce(si.is_lease_invoice, 0) = 1 then 'Rent' else 'Other' end as bill_type
        from "tabSales Invoice" si
        where si.customer = %s and si.docstatus = 1 and si.outstanding_amount > 0
        order by si.due_date, si.posting_date
        """,
        (customer,),
        as_dict=True,
    )
    return {"invoices": invoices, "available": wallet.balances(seller)["available"]}


@frappe.whitelist()
@privileged
def pay_bills(allocations):
    seller = current_seller()
    rows = as_list(allocations)
    if not rows:
        frappe.throw(_("Choose at least one bill to pay"))
    customer = customer_of(seller)
    company = get_settings().company
    doc = system(
        frappe.get_doc(
            {
                "doctype": "Wallet Bill Payment",
                "seller": seller,
                "company": company,
                "invoices": [{"sales_invoice": row["sales_invoice"], "allocated_amount": flt(row["amount"])} for row in rows],
            }
        )
    )
    for row in doc.invoices:
        if frappe.db.get_value("Sales Invoice", row.sales_invoice, "customer") != customer:
            frappe.throw(_("{0} is not your bill").format(row.sales_invoice))
    doc.insert()
    doc.submit()
    return {"name": doc.name, "total": doc.total_amount, "balances": wallet.balances(seller)}


@frappe.whitelist()
def get_bill_payments(start=0, page_length=20):
    seller = current_seller(active=False)
    return frappe.get_all(
        "Wallet Bill Payment",
        filters={"seller": seller, "docstatus": 1},
        fields=["name", "posting_date", "total_amount"],
        order_by="creation desc",
        start=cint(start),
        page_length=cint(page_length),
    )


@frappe.whitelist()
def get_sales_summary(from_date=None, to_date=None):
    seller = current_seller(active=False)
    from_date = from_date or add_days(today(), -30)
    to_date = to_date or today()
    totals = frappe.db.sql(
        """
        select count(*) as orders,
               coalesce(sum(items_total), 0) as net_sales,
               coalesce(sum(vat_total), 0) as vat,
               coalesce(sum(commission_amount + commission_vat), 0) as fees,
               coalesce(sum(seller_net), 0) as earnings
        from "tabSeller Order"
        where seller = %s and status <> 'Cancelled' and creation::date between %s and %s
        """,
        (seller, getdate(from_date), getdate(to_date)),
        as_dict=True,
    )[0]
    top = frappe.db.sql(
        """
        select oi.listing, oi.item_name, sum(oi.qty) as qty, sum(oi.amount) as amount
        from "tabSeller Order Item" oi join "tabSeller Order" so on so.name = oi.parent
        where so.seller = %s and so.status <> 'Cancelled' and so.creation::date between %s and %s
        group by oi.listing, oi.item_name order by amount desc limit 10
        """,
        (seller, getdate(from_date), getdate(to_date)),
        as_dict=True,
    )
    return {"totals": totals, "top_products": top}


@frappe.whitelist()
@privileged
def upload_listing_image(listing, filename, content):
    seller = current_seller(active=False)
    owned("Marketplace Listing", listing, seller)
    raw = base64.b64decode(content.split(",", 1)[-1])
    if len(raw) > MAX_IMAGE_BYTES:
        frappe.throw(_("Photos can be up to 6 MB"))
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename or "photo")[:100]
    if not safe.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        frappe.throw(_("Upload a JPG, PNG or WEBP photo"))
    file = frappe.get_doc({"doctype": "File", "file_name": safe, "content": raw, "attached_to_doctype": "Marketplace Listing", "attached_to_name": listing, "is_private": 0})
    file.save(ignore_permissions=True)
    return file.file_url


PROFILE_FIELDS = ("tagline", "description", "logo", "banner", "holiday_mode", "return_policy", "contact_phone", "contact_email")
PROFILE_TABLES = {
    "working_hours": ("day", "is_closed", "opens_at", "closes_at"),
    "closed_dates": ("date", "reason"),
    "social_links": ("platform", "url"),
    "gallery": ("image", "caption"),
    "shop_tags": ("tag",),
}


@frappe.whitelist()
def get_profile():
    seller = current_seller(active=False)
    doc = frappe.get_doc("Marketplace Seller", seller)
    data = {field: doc.get(field) for field in PROFILE_FIELDS}
    data["seller_name"] = doc.seller_name
    data["shop_slug"] = doc.shop_slug
    for table, fields in PROFILE_TABLES.items():
        data[table] = [{field: str(row.get(field)) if row.get(field) is not None and field.endswith("_at") else row.get(field) for field in fields} for row in doc.get(table)]
    return data


@frappe.whitelist()
@privileged
def save_profile(values):
    seller = current_seller(active=False)
    values = as_dict(values)
    doc = frappe.get_doc("Marketplace Seller", seller)
    for field in PROFILE_FIELDS:
        if field in values:
            doc.set(field, values[field])
    for table, fields in PROFILE_TABLES.items():
        if table in values:
            doc.set(table, [])
            for row in as_list(values[table]):
                doc.append(table, {field: row.get(field) for field in fields if row.get(field) not in (None, "")})
    system(doc).save()
    return True


@frappe.whitelist()
def get_plans():
    seller = current_seller(active=False)
    rows = frappe.get_all("Seller Plan", filters={"enabled": 1}, fields=["name", "plan_name", "monthly_fee", "annual_fee", "listing_limit", "commission_rate", "featured_slots", "description", "is_default"], order_by="monthly_fee asc")
    current = frappe.db.get_value("Marketplace Seller", seller, ["current_plan", "plan_expires_on"], as_dict=True)
    active = plans.plan_for(seller)
    return {
        "plans": rows,
        "current": active.name if active else None,
        "expires_on": current.plan_expires_on if current else None,
        "listings_used": frappe.db.count("Marketplace Listing", {"seller": seller, "status": ["!=", "Archived"]}),
        "available": wallet.balances(seller)["available"],
        "vat_rate": flt(get_settings().default_vat_rate or 16),
    }


@frappe.whitelist()
@privileged
def subscribe_to_plan(plan, billing_period="Monthly"):
    seller = current_seller()
    doc = system(frappe.get_doc({"doctype": "Seller Subscription", "seller": seller, "plan": plan, "billing_period": billing_period, "auto_renew": 1}))
    doc.insert()
    doc.activate()
    return {"name": doc.name, "ends": doc.end_date, "total": doc.total}


@frappe.whitelist()
def get_ad_packages():
    return frappe.get_all("Ad Package", filters={"enabled": 1}, fields=["name", "package_name", "placement", "price", "duration_days", "max_listings", "description"], order_by="price asc")


@frappe.whitelist()
def get_ads():
    seller = current_seller(active=False)
    rows = frappe.get_all("Seller Ad", filters={"seller": seller}, fields=["name", "package", "status", "start_date", "end_date", "total"], order_by="creation desc")
    for row in rows:
        row["listings"] = frappe.get_all("Seller Ad Listing", filters={"parent": row.name}, pluck="listing")
    return rows


@frappe.whitelist()
@privileged
def buy_ad(package, listings):
    seller = current_seller()
    doc = system(frappe.get_doc({"doctype": "Seller Ad", "seller": seller, "package": package, "listings": [{"listing": name} for name in as_list(listings)]}))
    doc.insert()
    doc.activate()
    return {"name": doc.name, "ends": doc.end_date, "total": doc.total}


@frappe.whitelist()
@privileged
def cancel_ad(name):
    seller = current_seller(active=False)
    return owned("Seller Ad", name, seller).cancel_ad()


@frappe.whitelist()
@privileged
def upload_digital_file(listing, filename, content):
    seller = current_seller(active=False)
    owned("Marketplace Listing", listing, seller)
    raw = base64.b64decode(content.split(",", 1)[-1])
    if len(raw) > MAX_DIGITAL_BYTES:
        frappe.throw(_("Files can be up to 50 MB"))
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", filename or "file")[:100]
    if not safe.lower().endswith((".pdf", ".zip", ".epub", ".mp3", ".mp4", ".docx", ".xlsx", ".png", ".jpg")):
        frappe.throw(_("This file type is not allowed"))
    file = frappe.get_doc({"doctype": "File", "file_name": safe, "content": raw, "attached_to_doctype": "Marketplace Listing", "attached_to_name": listing, "is_private": 1})
    file.save(ignore_permissions=True)
    return file.file_url


VARIANT_EDITABLE = ("sku", "enabled", "price", "compare_at_price", "stock_qty", "image", "barcode", "weight_kg")


def apply_variant_edits(doc, incoming):
    rows = {row.item_code: row for row in doc.get("variants") or []}
    for entry in incoming:
        row = rows.get(entry.get("item_code"))
        if row is None:
            continue
        for field in VARIANT_EDITABLE:
            if field in entry:
                value = entry[field]
                if field in ("price", "compare_at_price") and value in ("", None, 0):
                    value = None
                if field == "stock_qty" and doc.stock_mode != "Seller Managed Quantity":
                    continue
                row.set(field, value)


@frappe.whitelist()
def get_item_attributes(category=None):
    current_seller(active=False)
    if category:
        configured = engagement.category_attributes(category)
        if configured:
            return configured
    rows = []
    for name in frappe.get_all("Item Attribute", pluck="name", order_by="name"):
        values = frappe.get_all("Item Attribute Value", filters={"parent": name}, pluck="attribute_value", order_by="idx")
        rows.append({"attribute": name, "use_for_variants": 1, "filterable": 1, "required": 0, "values": values})
    return rows


@frappe.whitelist()
@privileged
def generate_listing_variants(name, attributes):
    seller = current_seller()
    doc = owned("Marketplace Listing", name, seller)
    if doc.status not in ("Draft", "Rejected", "Paused", "Published", "Approved"):
        frappe.throw(_("A listing in {0} cannot be edited").format(doc.status))
    return variants.generate(doc, attributes)
