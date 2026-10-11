import json

import frappe
from frappe import _
from frappe.utils import cint, flt, get_datetime, getdate, now_datetime, today

from apps.bbs_marketplace.marketplace import store
from apps.bbs_marketplace.marketplace.utils import buyer_for_user, get_settings

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
COMPARE_LIMIT = 4
NEWSLETTER_GROUP = "Marketplace Newsletter"


def as_list(value):
    if isinstance(value, str):
        value = value.strip()
        return json.loads(value) if value.startswith("[") else [part.strip() for part in value.split(",") if part.strip()]
    return list(value or [])


@frappe.whitelist()
def toggle_wishlist(listing):
    customer = store.require_buyer()
    existing = frappe.db.get_value("Marketplace Wishlist Item", {"customer": customer, "listing": listing})
    if existing:
        frappe.delete_doc("Marketplace Wishlist Item", existing, ignore_permissions=True)
        wishlisted = False
    else:
        if frappe.db.get_value("Marketplace Listing", listing, "status") != "Published":
            frappe.throw(_("This product is not available"))
        doc = frappe.get_doc({"doctype": "Marketplace Wishlist Item", "customer": customer, "listing": listing})
        doc.flags.ignore_permissions = True
        doc.insert()
        wishlisted = True
    return {"wishlisted": wishlisted, "count": cint(frappe.db.get_value("Marketplace Listing", listing, "wishlist_count"))}


@frappe.whitelist()
def get_wishlist(buyer_type=None):
    customer = store.require_buyer()
    names = frappe.get_all("Marketplace Wishlist Item", filters={"customer": customer}, order_by="added_on desc", pluck="listing")
    kind = store.resolve_buyer_type(buyer_type)
    cards = []
    for name in names:
        if frappe.db.get_value("Marketplace Listing", name, "status") == "Published":
            cards.append(store.listing_card(frappe._dict(name=name), kind))
    return cards


@frappe.whitelist(allow_guest=True)
def compare_listings(listings, buyer_type=None):
    names = as_list(listings)[:COMPARE_LIMIT]
    kind = store.resolve_buyer_type(buyer_type)
    cards, attributes = [], {}
    for name in names:
        if frappe.db.get_value("Marketplace Listing", name, "status") != "Published":
            continue
        doc = frappe.get_doc("Marketplace Listing", name)
        card = store.listing_card(frappe._dict(name=name), kind)
        card.update({"warranty": doc.warranty, "weight_kg": flt(doc.weight_kg), "return_eligible": cint(doc.return_eligible), "cod_allowed": cint(doc.cod_allowed)})
        cards.append(card)
        for row in doc.attributes:
            attributes.setdefault(row.attribute, {})[name] = row.value
    return {"items": cards, "attributes": [{"attribute": key, "values": values} for key, values in attributes.items()]}


def category_attributes(category):
    from apps.bbs_marketplace.marketplace.commission import item_group_chain

    seen, rows = set(), []
    for group in reversed(item_group_chain(category)):
        meta = frappe.get_meta("Item Group")
        if not meta.has_field("marketplace_attributes"):
            break
        for row in frappe.get_all("Category Attribute", filters={"parent": group, "parenttype": "Item Group"}, fields=["attribute", "use_for_variants", "filterable", "required"], order_by="idx"):
            if row.attribute in seen:
                continue
            seen.add(row.attribute)
            values = frappe.get_all("Item Attribute Value", filters={"parent": row.attribute}, pluck="attribute_value", order_by="idx")
            rows.append({**row, "values": values})
    return rows


@frappe.whitelist(allow_guest=True)
def get_category_filters(category):
    return [row for row in category_attributes(category) if cint(row["filterable"])]


@frappe.whitelist(allow_guest=True)
def get_faqs(category=None):
    filters = {"published": 1}
    if category:
        filters["category"] = category
    return frappe.get_all("Marketplace FAQ", filters=filters, fields=["name", "question", "answer", "category"], order_by="sort_order asc, creation asc")


def shop_open_now(seller):
    if cint(seller.holiday_mode):
        return False
    now = get_datetime(now_datetime())
    if any(getdate(row.date) == now.date() for row in seller.closed_dates):
        return False
    hours = [row for row in seller.working_hours if row.day == WEEKDAYS[now.weekday()]]
    if not hours:
        return True
    row = hours[0]
    if row.is_closed:
        return False
    if row.opens_at and row.closes_at:
        current = now.strftime("%H:%M:%S")
        return str(row.opens_at) <= current <= str(row.closes_at)
    return True


@frappe.whitelist(allow_guest=True)
def get_shop(shop=None, slug=None):
    name = shop or frappe.db.get_value("Marketplace Seller", {"shop_slug": slug})
    if not name or frappe.db.get_value("Marketplace Seller", name, "status") != "Active":
        frappe.throw(_("Shop not found"), frappe.DoesNotExistError)
    seller = frappe.get_doc("Marketplace Seller", name)
    return {
        "name": seller.name,
        "shop_name": seller.seller_name,
        "slug": seller.shop_slug,
        "tagline": seller.tagline,
        "description": seller.description,
        "logo": seller.logo,
        "banner": seller.banner,
        "rating": flt(seller.rating, 2),
        "rating_count": cint(seller.rating_count),
        "is_open": shop_open_now(seller),
        "holiday_mode": cint(seller.holiday_mode),
        "contact_phone": seller.contact_phone,
        "contact_email": seller.contact_email,
        "return_policy": seller.return_policy,
        "working_hours": [{"day": r.day, "is_closed": cint(r.is_closed), "opens_at": str(r.opens_at or ""), "closes_at": str(r.closes_at or "")} for r in seller.working_hours],
        "closed_dates": [{"date": str(r.date), "reason": r.reason} for r in seller.closed_dates if getdate(r.date) >= getdate(today())],
        "social_links": [{"platform": r.platform, "url": r.url} for r in seller.social_links],
        "gallery": [{"image": r.image, "caption": r.caption} for r in seller.gallery],
        "tags": [r.tag for r in seller.shop_tags],
        "listing_count": frappe.db.count("Marketplace Listing", {"seller": name, "status": "Published"}),
    }


@frappe.whitelist(allow_guest=True)
def subscribe_newsletter(email):
    email = (email or "").strip().lower()
    if "@" not in email:
        frappe.throw(_("Enter a valid email address"))
    if not frappe.db.exists("DocType", "Email Group Member") or not frappe.db.exists("Email Group", NEWSLETTER_GROUP):
        frappe.throw(_("The newsletter is not set up"))
    if not frappe.db.exists("Email Group Member", {"email_group": NEWSLETTER_GROUP, "email": email}):
        doc = frappe.get_doc({"doctype": "Email Group Member", "email_group": NEWSLETTER_GROUP, "email": email})
        doc.flags.ignore_permissions = True
        doc.insert()
    return True


@frappe.whitelist()
def create_ticket(subject, description, order=None):
    customer = store.require_buyer()
    if order and frappe.db.get_value("Marketplace Order", order, "customer") != customer:
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    email = frappe.db.get_value("Customer", customer, "email_id") or frappe.session.user
    doc = frappe.get_doc({"doctype": "Issue", "subject": subject, "description": description, "customer": customer, "raised_by": email, "marketplace_order": order, "status": "Open"})
    doc.flags.ignore_permissions = True
    doc.insert()
    return doc.name


@frappe.whitelist()
def get_my_tickets():
    customer = store.require_buyer()
    return frappe.get_all("Issue", filters={"customer": customer}, fields=["name", "subject", "status", "marketplace_order", "creation", "modified"], order_by="modified desc")


def paid_digital_lines(order):
    doc = frappe.get_doc("Marketplace Order", order)
    if doc.customer != store.require_buyer():
        frappe.throw(_("This is not your order"), frappe.PermissionError)
    if doc.payment_status != "Paid" and doc.status not in ("Processing", "Delivered", "Completed"):
        frappe.throw(_("Downloads unlock once the order is paid"))
    return doc, [row for row in doc.items if cint(frappe.db.get_value("Marketplace Listing", row.listing, "is_digital"))]


@frappe.whitelist()
def get_downloads(order):
    doc, lines = paid_digital_lines(order)
    result = []
    for row in lines:
        listing = frappe.get_doc("Marketplace Listing", row.listing)
        limit = cint(listing.download_limit)
        result.append(
            {
                "order_item": row.name,
                "listing": listing.name,
                "title": listing.listing_title,
                "downloads_used": cint(row.download_count),
                "downloads_left": max(0, limit - cint(row.download_count)) if limit else None,
                "files": [{"index": index, "title": f.title, "version": f.version} for index, f in enumerate(listing.digital_files)],
            }
        )
    return result


@frappe.whitelist()
def download_file(order, order_item, index=0):
    doc, lines = paid_digital_lines(order)
    row = next((line for line in lines if line.name == order_item), None)
    if not row:
        frappe.throw(_("Nothing to download here"), frappe.DoesNotExistError)
    listing = frappe.get_doc("Marketplace Listing", row.listing)
    limit = cint(listing.download_limit)
    if limit and cint(row.download_count) >= limit:
        frappe.throw(_("The download limit for this product has been reached"))
    files = listing.digital_files
    position = cint(index)
    if position < 0 or position >= len(files):
        frappe.throw(_("File not found"), frappe.DoesNotExistError)
    frappe.db.set_value("Marketplace Order Item", row.name, "download_count", cint(row.download_count) + 1, update_modified=False)
    return {"title": files[position].title, "url": files[position].file}
