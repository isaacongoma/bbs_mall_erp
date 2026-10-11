import frappe
from frappe import _
from frappe.utils import cint, flt, getdate, now_datetime, today


def get_settings():
    return frappe.get_single("Marketplace Settings")


def money(value, currency=None):
    return flt(value, frappe.get_precision("Marketplace Order", "grand_total") or 2)


def company():
    return get_settings().company


def log_event(doc, status, note=None, field="status_log"):
    doc.append(field, {"status": status, "at": now_datetime(), "by": frappe.flags.get("portal_user") or frappe.session.user, "note": note or ""})
    if doc.doctype in ("Marketplace Order", "Seller Order"):
        from apps.bbs_marketplace.marketplace import notifications

        notifications.queue_status(doc, status)


def seller_for_user(user=None):
    user = user or frappe.session.user
    customer = frappe.db.get_value("Customer", {"marketplace_user": user}, "name")
    if not customer:
        rows = frappe.get_all("Tenant Portal User", filters={"user": user}, fields=["parent"], limit=1)
        customer = rows[0].parent if rows else None
    if not customer:
        return None
    return frappe.db.get_value("Marketplace Seller", {"customer": customer}, "name")


def buyer_for_user(user=None):
    user = user or frappe.session.user
    return frappe.db.get_value("Customer", {"marketplace_user": user}, "name")


def require_seller(user=None, active=True):
    seller = seller_for_user(user)
    if not seller:
        frappe.throw(_("You are not registered as a marketplace seller"), frappe.PermissionError)
    if active and frappe.db.get_value("Marketplace Seller", seller, "status") != "Active":
        frappe.throw(_("Your seller account is not active"), frappe.PermissionError)
    return seller


def vat_split(gross, rate, inclusive=True):
    rate = flt(rate) / 100.0
    if inclusive:
        net = flt(gross) / (1 + rate)
        return flt(net, 4), flt(gross) - flt(net, 4)
    return flt(gross), flt(gross) * rate
