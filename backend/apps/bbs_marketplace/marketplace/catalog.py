import re

import frappe
from frappe import _
from frappe.utils import cint, flt


def block_item_delete(doc, method=None):
    if frappe.db.exists("Marketplace Listing", {"item": doc.name}):
        frappe.throw(_("Item {0} has a marketplace listing. Archive the listing instead").format(doc.name))


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def unique_slug(base, doctype="Marketplace Listing", name=None):
    slug = slugify(base) or "listing"
    candidate, counter = slug, 1
    while frappe.db.exists(doctype, {"slug": candidate, "name": ["!=", name or ""]}):
        counter += 1
        candidate = f"{slug}-{counter}"
    return candidate


def sync_item_prices(listing):
    from apps.bbs_marketplace.marketplace.utils import get_settings

    settings = get_settings()
    price_lists = []
    if settings.price_list_b2c and listing.listing_type in ("B2C", "Both"):
        price_lists.append(settings.price_list_b2c)
    if settings.price_list_b2b and listing.listing_type in ("B2B", "Both"):
        price_lists.append(settings.price_list_b2b)
    rate = flt(listing.price)
    for price_list in price_lists:
        existing = frappe.db.get_value("Item Price", {"item_code": listing.item, "price_list": price_list})
        if existing:
            frappe.db.set_value("Item Price", existing, "price_list_rate", rate)
        else:
            doc = frappe.get_doc({"doctype": "Item Price", "item_code": listing.item, "price_list": price_list, "price_list_rate": rate, "selling": 1})
            doc.flags.ignore_permissions = True
            doc.insert()
