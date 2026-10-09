import json

import frappe
from frappe import _

from erpnext.erpnext_integrations.mpesa.payments import (
    get_client,
    get_settings,
    record_transaction,
    start_stk_push,
)


@frappe.whitelist(methods=["POST"])
def stk_push_for_payment_request(payment_request, phone_number):
    frappe.has_permission("Payment Request", "read", payment_request, throw=True)
    return start_stk_push(payment_request, phone_number).as_dict()


@frappe.whitelist(methods=["POST"])
def register_c2b_urls():
    frappe.only_for(("System Manager", "Accounts Manager"))
    return get_client().register_c2b_urls()


@frappe.whitelist(methods=["POST"])
def pay_out_payment_entry(payment_entry, phone_number):
    frappe.only_for(("System Manager", "Accounts Manager"))
    entry = frappe.get_doc("Payment Entry", payment_entry)
    if entry.docstatus != 1 or entry.payment_type != "Pay":
        frappe.throw(_("Only submitted Pay entries can be paid out through M-Pesa"))
    settings = get_settings()
    response = get_client(settings).b2c_payment(
        phone_number, entry.paid_amount, f"Payout {entry.name}", occasion=entry.name
    )
    return record_transaction(
        {"originator_conversation_id": response["OriginatorConversationID"]},
        {
            "transaction_type": "B2C",
            "status": "Pending",
            "amount": entry.paid_amount,
            "phone_number": phone_number,
            "conversation_id": response.get("ConversationID"),
            "payment_entry": entry.name,
            "company": settings.company,
            "raw_payload": json.dumps(response),
        },
    ).as_dict()


@frappe.whitelist(methods=["POST"])
def query_transaction_status(receipt_number):
    frappe.only_for(("System Manager", "Accounts Manager"))
    return get_client().transaction_status(receipt_number)


@frappe.whitelist(methods=["POST"])
def reverse_transaction(receipt_number):
    frappe.only_for(("System Manager", "Accounts Manager"))
    transaction = frappe.get_doc("M-Pesa Transaction", {"receipt_number": receipt_number})
    return get_client().reversal(receipt_number, transaction.amount)
