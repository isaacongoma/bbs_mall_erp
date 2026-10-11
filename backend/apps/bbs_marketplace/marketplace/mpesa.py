import json

import frappe
from frappe import _
from frappe.utils import flt, now_datetime

from erpnext.erpnext_integrations.mpesa import payments as shared
from erpnext.erpnext_integrations.mpesa.client import DarajaError


def format_phone(phone):
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if digits.startswith("0"):
        digits = "254" + digits[1:]
    elif digits.startswith(("7", "1")) and len(digits) == 9:
        digits = "254" + digits
    return digits


def configured():
    return bool(frappe.db.get_single_value("M-Pesa Settings", "enabled"))


def error_text(error):
    payload = getattr(error, "payload", None)
    if isinstance(payload, dict):
        return payload.get("errorMessage") or payload.get("ResponseDescription") or str(error)
    return str(error)


def stk_push(payment_name):
    payment = frappe.get_doc("Marketplace Payment", payment_name)
    payment.flags.ignore_permissions = True
    if not configured():
        frappe.throw(_("M-Pesa is not enabled. Configure M-Pesa Settings first."))
    try:
        response = shared.get_client().stk_push(
            format_phone(payment.phone), flt(payment.amount), payment.marketplace_order, f"Order {payment.marketplace_order}"
        )
    except DarajaError as error:
        payment.status = "Failed"
        payment.failure_reason = error_text(error)
        payment.save()
        return payment
    payment.response_payload = json.dumps(response)
    payment.status = "Pending"
    payment.merchant_request_id = response.get("MerchantRequestID")
    payment.checkout_request_id = response.get("CheckoutRequestID")
    payment.save()
    shared.record_transaction(
        {"checkout_request_id": payment.checkout_request_id},
        {
            "transaction_type": "STK Push",
            "status": "Pending",
            "amount": payment.amount,
            "phone_number": format_phone(payment.phone),
            "bill_ref_number": payment.marketplace_order,
            "merchant_request_id": payment.merchant_request_id,
            "company": payment.company,
            "raw_payload": json.dumps(response),
        },
    )
    return payment


def b2c_pay(withdrawal):
    if not configured():
        frappe.throw(_("M-Pesa is not enabled. Configure M-Pesa Settings first."))
    try:
        response = shared.get_client().b2c_payment(
            format_phone(withdrawal.mpesa_number), flt(withdrawal.net_amount), f"Wallet withdrawal {withdrawal.name}", occasion=withdrawal.name
        )
    except DarajaError as error:
        return {"ok": False, "error": error_text(error)}
    shared.record_transaction(
        {"originator_conversation_id": response.get("OriginatorConversationID")},
        {
            "transaction_type": "B2C",
            "status": "Pending",
            "amount": withdrawal.net_amount,
            "phone_number": format_phone(withdrawal.mpesa_number),
            "conversation_id": response.get("ConversationID"),
            "bill_ref_number": withdrawal.name,
            "raw_payload": json.dumps(response),
        },
    )
    return {"ok": True, "conversation_id": response.get("ConversationID"), "originator": response.get("OriginatorConversationID")}


def on_transaction_update(doc, method=None):
    if doc.status not in ("Completed", "Failed", "Cancelled"):
        return
    if doc.transaction_type == "STK Push" and doc.checkout_request_id:
        apply_stk(doc)
    elif doc.transaction_type == "B2C" and doc.originator_conversation_id:
        apply_b2c(doc)


def apply_stk(transaction):
    name = frappe.db.get_value("Marketplace Payment", {"checkout_request_id": transaction.checkout_request_id})
    if not name:
        return
    payment = frappe.get_doc("Marketplace Payment", name)
    if payment.status == "Paid":
        return
    payment.flags.ignore_permissions = True
    if transaction.status == "Completed":
        paid = flt(transaction.amount)
        if abs(paid - flt(payment.amount)) > 0.5:
            payment.failure_reason = _("Paid {0} but {1} was expected").format(paid, payment.amount)
        payment.gateway_receipt = transaction.receipt_number
        payment.mark_paid(paid_amount=paid or flt(payment.amount))
    else:
        payment.status = "Cancelled" if transaction.status == "Cancelled" else "Failed"
        payment.failure_reason = transaction.result_desc
        payment.save()


def apply_b2c(transaction):
    name = frappe.db.get_value("Seller Withdrawal", {"originator_conversation_id": transaction.originator_conversation_id})
    if not name:
        return
    withdrawal = frappe.get_doc("Seller Withdrawal", name)
    if withdrawal.status in ("Paid", "Failed", "Rejected", "Cancelled"):
        return
    withdrawal.flags.ignore_permissions = True
    if transaction.status == "Completed":
        withdrawal.mark_paid(receipt_no=transaction.receipt_number)
    else:
        withdrawal.mark_failed(transaction.result_desc or _("M-Pesa rejected the payout"))
