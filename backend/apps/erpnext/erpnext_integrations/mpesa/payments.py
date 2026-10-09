import hmac
import json

import frappe
from frappe import _
from frappe.utils import flt, get_datetime

from erpnext.erpnext_integrations.mpesa.client import DarajaClient, requests_http

HTTP = {"call": requests_http}


def get_settings():
    settings = frappe.get_doc("M-Pesa Settings")
    if not settings.enabled:
        frappe.throw(_("M-Pesa is not enabled"))
    return settings


def get_client(settings=None):
    return DarajaClient(settings or get_settings(), http=HTTP["call"])


def parse_time(value):
    text = str(value)
    return get_datetime(f"{text[0:4]}-{text[4:6]}-{text[6:8]} {text[8:10]}:{text[10:12]}:{text[12:14]}")


def authorize_callback(settings, token):
    expected = settings.get_password("callback_token", raise_exception=False) or ""
    if not expected or not hmac.compare_digest(str(token or ""), expected):
        raise frappe.PermissionError(_("Invalid M-Pesa callback token"))
    allowed = [ip.strip() for ip in (settings.allowed_ips or "").replace(",", "\n").splitlines() if ip.strip()]
    source = frappe.local.request_ip
    if allowed and source not in allowed:
        raise frappe.PermissionError(_("M-Pesa callback from {0} is not allowed").format(source))


def record_transaction(filters, values):
    name = frappe.db.get_value("M-Pesa Transaction", filters)
    if name:
        doc = frappe.get_doc("M-Pesa Transaction", name)
        doc.update(values)
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc({"doctype": "M-Pesa Transaction", **filters, **values}).insert(ignore_permissions=True)
    return doc


def start_stk_push(payment_request, phone_number):
    settings = get_settings()
    request_doc = frappe.get_doc("Payment Request", payment_request)
    reference = request_doc.reference_name
    response = get_client(settings).stk_push(
        phone_number, request_doc.grand_total, reference, f"Payment for {reference}"
    )
    return frappe.get_doc(
        {
            "doctype": "M-Pesa Transaction",
            "transaction_type": "STK Push",
            "status": "Pending",
            "amount": request_doc.grand_total,
            "phone_number": phone_number,
            "bill_ref_number": reference,
            "merchant_request_id": response.get("MerchantRequestID"),
            "checkout_request_id": response.get("CheckoutRequestID"),
            "company": settings.company,
            "payment_request": payment_request,
            "sales_invoice": reference if request_doc.reference_doctype == "Sales Invoice" else None,
            "raw_payload": json.dumps(response),
        }
    ).insert(ignore_permissions=True)


def create_payment_entry(transaction, settings):
    invoice_name = transaction.sales_invoice or (
        transaction.bill_ref_number if frappe.db.exists("Sales Invoice", transaction.bill_ref_number or "") else None
    )
    if not invoice_name:
        return None
    invoice = frappe.get_doc("Sales Invoice", invoice_name)
    if invoice.docstatus != 1 or flt(invoice.outstanding_amount) <= 0:
        return None
    from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

    allocated = min(flt(transaction.amount), flt(invoice.outstanding_amount))
    entry = get_payment_entry("Sales Invoice", invoice_name, party_amount=allocated)
    entry.mode_of_payment = settings.mode_of_payment
    entry.paid_to = settings.receiving_account
    entry.reference_no = transaction.receipt_number
    entry.reference_date = get_datetime(transaction.transaction_time).date()
    entry.flags.ignore_permissions = True
    entry.insert()
    entry.submit()
    transaction.sales_invoice = invoice_name
    transaction.payment_entry = entry.name
    return entry


def settle(transaction, settings):
    if transaction.payment_entry:
        return
    create_payment_entry(transaction, settings)
    transaction.save(ignore_permissions=True)
