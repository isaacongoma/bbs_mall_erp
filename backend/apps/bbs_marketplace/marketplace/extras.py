import frappe
from frappe import _
from frappe.utils import flt

from apps.bbs_marketplace.marketplace import accounting
from apps.bbs_marketplace.marketplace.utils import get_settings

STATUS_MAP = {
    "picked_up": "Picked Up",
    "in_transit": "In Transit",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "failed": "Failed Delivery",
    "returned": "Returned to Seller",
}


def apply_courier_update(courier, payload):
    tracking = payload.get("tracking_no") or payload.get("tracking")
    raw_status = str(payload.get("status") or "").strip().lower().replace(" ", "_")
    status = STATUS_MAP.get(raw_status)
    if not tracking or not status:
        return 0
    name = frappe.db.get_value("Marketplace Shipment", {"tracking_no": tracking, "courier": courier})
    if not name:
        return 0
    shipment = frappe.get_doc("Marketplace Shipment", name)
    if shipment.status == status:
        return 0
    shipment.set_status(status, payload.get("note"), payload.get("location"), source="Courier", cod_collected=payload.get("cod_collected"))
    return 1


def absorb_refund(seller_order_name, refund_gross, reference):
    so = frappe.get_doc("Seller Order", seller_order_name)
    settings = get_settings()
    order = frappe.get_doc("Marketplace Order", so.marketplace_order)
    receipts, is_party_account = accounting.receipts_account(order)
    credit = {"account": receipts, "credit_in_account_currency": flt(refund_gross, 2)}
    if is_party_account:
        credit.update({"party_type": "Customer", "party": order.customer})
    rows = [{"account": accounting.setting_account("marketing_expense_account"), "debit_in_account_currency": flt(refund_gross, 2)}, credit]
    return accounting.make_journal(settings.company, frappe.utils.today(), rows, _("Refund absorbed by BBS Mall for seller order {0}").format(so.name), reference)
