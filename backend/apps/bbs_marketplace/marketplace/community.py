from xml.sax.saxutils import escape

import frappe
from frappe import _
from frappe.utils import cint, flt, now_datetime

from apps.bbs_marketplace.marketplace import store, utils
from apps.bbs_marketplace.marketplace.utils import get_settings

RECENT_LIMIT = 20


def current_customer():
    if frappe.session.user == "Guest":
        return None
    return frappe.db.get_value("Customer", {"marketplace_user": frappe.session.user})


@frappe.whitelist(allow_guest=True)
def get_questions(listing):
    return frappe.get_all(
        "Product Question",
        filters={"listing": listing, "status": "Answered"},
        fields=["name", "question", "answer", "answered_on"],
        order_by="answered_on desc",
        limit=50,
    )


@frappe.whitelist()
def ask_question(listing, question):
    customer = store.require_buyer()
    if frappe.db.get_value("Marketplace Listing", listing, "status") != "Published":
        frappe.throw(_("This product is not available"))
    if not (question or "").strip():
        frappe.throw(_("Type your question"))
    doc = frappe.get_doc({"doctype": "Product Question", "listing": listing, "customer": customer, "question": question.strip(), "status": "Pending"})
    doc.flags.ignore_permissions = True
    doc.insert()
    return doc.name


def is_staff():
    roles = frappe.get_roles()
    return "Marketplace Manager" in roles or "System Manager" in roles


@frappe.whitelist()
def answer_question(name, answer):
    if not is_staff():
        seller = utils.require_seller(active=False)
        if frappe.db.get_value("Product Question", name, "seller") != seller:
            frappe.throw(_("This question is for another seller"), frappe.PermissionError)
    if not (answer or "").strip():
        frappe.throw(_("Type the answer"))
    frappe.db.set_value(
        "Product Question",
        name,
        {"answer": answer.strip(), "status": "Answered", "answered_by": frappe.flags.get("portal_user") or frappe.session.user, "answered_on": now_datetime()},
    )
    return "Answered"


@frappe.whitelist()
def get_seller_questions(status="Pending"):
    seller = utils.require_seller(active=False)
    return frappe.get_all(
        "Product Question",
        filters={"seller": seller, "status": status},
        fields=["name", "listing", "question", "answer", "creation"],
        order_by="creation desc",
        limit=100,
    )


@frappe.whitelist()
def toggle_follow_seller(seller):
    customer = store.require_buyer()
    existing = frappe.db.get_value("Marketplace Seller Follow", {"customer": customer, "seller": seller})
    if existing:
        frappe.delete_doc("Marketplace Seller Follow", existing, ignore_permissions=True)
        following = False
    else:
        doc = frappe.get_doc({"doctype": "Marketplace Seller Follow", "customer": customer, "seller": seller})
        doc.flags.ignore_permissions = True
        doc.insert()
        following = True
    return {"following": following, "followers": frappe.db.count("Marketplace Seller Follow", {"seller": seller})}


@frappe.whitelist()
def get_followed_sellers():
    customer = store.require_buyer()
    names = frappe.get_all("Marketplace Seller Follow", filters={"customer": customer}, pluck="seller")
    return frappe.get_all("Marketplace Seller", filters={"name": ["in", names or [""]], "status": "Active"}, fields=["name", "seller_name", "shop_slug", "logo", "rating"])


@frappe.whitelist()
def record_view(listing):
    customer = current_customer()
    if not customer:
        return False
    existing = frappe.db.get_value("Recently Viewed Product", {"customer": customer, "listing": listing})
    if existing:
        frappe.db.set_value("Recently Viewed Product", existing, "viewed_on", now_datetime(), update_modified=False)
        return True
    doc = frappe.get_doc({"doctype": "Recently Viewed Product", "customer": customer, "listing": listing, "viewed_on": now_datetime()})
    doc.flags.ignore_permissions = True
    doc.insert()
    old = frappe.get_all("Recently Viewed Product", filters={"customer": customer}, order_by="viewed_on desc", pluck="name")[RECENT_LIMIT:]
    for name in old:
        frappe.delete_doc("Recently Viewed Product", name, ignore_permissions=True)
    return True


@frappe.whitelist()
def get_recently_viewed(buyer_type=None):
    customer = store.require_buyer()
    names = frappe.get_all("Recently Viewed Product", filters={"customer": customer}, order_by="viewed_on desc", pluck="listing", limit=RECENT_LIMIT)
    kind = store.resolve_buyer_type(buyer_type)
    return [store.listing_card(frappe._dict(name=name), kind) for name in names if frappe.db.get_value("Marketplace Listing", name, "status") == "Published"]


def published(name):
    return frappe.db.get_value("Marketplace Listing", name, "status") == "Published"


@frappe.whitelist(allow_guest=True)
def get_bundle(listing, buyer_type=None):
    kind = store.resolve_buyer_type(buyer_type)
    doc = frappe.get_doc("Marketplace Listing", listing)
    names = [row.listing for row in doc.bundle_items if published(row.listing)]
    if not names:
        rows = frappe.db.sql(
            """
            select oi2.listing, count(*) from "tabMarketplace Order Item" oi1
            join "tabMarketplace Order Item" oi2 on oi2.parent = oi1.parent and oi2.listing != oi1.listing
            where oi1.listing = %s group by oi2.listing order by 2 desc limit 4
            """,
            listing,
        )
        names = [row[0] for row in rows if published(row[0])]
    return [store.listing_card(frappe._dict(name=name), kind) for name in names]


@frappe.whitelist(allow_guest=True)
def get_size_chart(listing):
    chart = frappe.db.get_value("Marketplace Listing", listing, "size_chart")
    if not chart:
        return None
    doc = frappe.get_doc("Marketplace Size Chart", chart)
    return {"name": doc.name, "unit": doc.unit, "notes": doc.notes, "rows": [{"size": r.size_label, "measurements": r.measurements} for r in doc.rows]}


@frappe.whitelist()
def get_seller_notices():
    seller = utils.require_seller(active=False)
    return frappe.get_all(
        "Seller Notice",
        filters={"published": 1},
        or_filters=[["audience", "=", "All Sellers"], ["seller", "=", seller]],
        fields=["name", "title", "message", "creation"],
        order_by="creation desc",
        limit=30,
    )


def feed_rows():
    settings = get_settings()
    rows = frappe.get_all(
        "Marketplace Listing",
        filters={"status": "Published"},
        fields=["name", "listing_title", "short_description", "slug", "price", "primary_image", "brand", "available_qty"],
    )
    base = (settings.storefront_url or "").rstrip("/")
    currency = frappe.get_cached_value("Company", settings.company, "default_currency") or "KES"
    for row in rows:
        row["link"] = f"{base}/products/{row.slug or row.name}"
        image = row.primary_image or ""
        row["image"] = f"{base}{image}" if image.startswith("/") else image
        row["availability"] = "in stock" if flt(row.available_qty) > 0 else "out of stock"
        row["currency"] = currency
    return rows


@frappe.whitelist(allow_guest=True)
def get_catalog_feed(format="json"):
    rows = feed_rows()
    if format != "xml":
        return rows
    items = "".join(
        "<item>"
        f"<g:id>{escape(r.name)}</g:id><title>{escape(r.listing_title or '')}</title>"
        f"<description>{escape(r.short_description or r.listing_title or '')}</description>"
        f"<link>{escape(r.link)}</link><g:image_link>{escape(r.image)}</g:image_link>"
        f"<g:availability>{r.availability}</g:availability><g:price>{flt(r.price):.2f} {r.currency}</g:price>"
        f"<g:brand>{escape(r.brand or '')}</g:brand><g:condition>new</g:condition>"
        "</item>"
        for r in rows
    )
    return '<?xml version="1.0"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Catalogue</title>' + items + "</channel></rss>"
