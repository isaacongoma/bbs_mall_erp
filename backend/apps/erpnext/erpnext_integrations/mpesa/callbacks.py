import json

import frappe

from erpnext.erpnext_integrations.mpesa.payments import (
    authorize_callback,
    parse_time,
    record_transaction,
    settle,
)

ACCEPTED = {"ResultCode": 0, "ResultDesc": "Accepted"}
REJECTED = {"ResultCode": "C2B00012", "ResultDesc": "Rejected"}


def run_as_administrator(fn):
    previous = frappe.session.user
    frappe.session.user = "Administrator"
    try:
        return fn()
    finally:
        frappe.session.user = previous


def parse_payload():
    data = frappe.local.form_dict
    payload = data.get("payload")
    if isinstance(payload, str):
        return json.loads(payload)
    if payload is not None:
        return payload
    return {key: value for key, value in data.items() if key not in {"token", "cmd"}}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def stk_callback(token=None, **kwargs):
    def run():
        settings = frappe.get_doc("M-Pesa Settings")
        authorize_callback(settings, token)
        payload = parse_payload()
        body = payload["Body"]["stkCallback"]
        values = {
            "transaction_type": "STK Push",
            "merchant_request_id": body.get("MerchantRequestID"),
            "result_code": str(body.get("ResultCode")),
            "result_desc": body.get("ResultDesc"),
            "raw_payload": json.dumps(payload),
        }
        if str(body.get("ResultCode")) != "0":
            values["status"] = "Cancelled" if str(body.get("ResultCode")) == "1032" else "Failed"
            record_transaction({"checkout_request_id": body["CheckoutRequestID"]}, values)
            return ACCEPTED
        items = {item["Name"]: item.get("Value") for item in body["CallbackMetadata"]["Item"]}
        receipt = items["MpesaReceiptNumber"]
        if frappe.db.exists("M-Pesa Transaction", {"receipt_number": receipt}):
            return ACCEPTED
        values.update(
            {
                "status": "Completed",
                "receipt_number": receipt,
                "amount": items.get("Amount"),
                "phone_number": str(items.get("PhoneNumber")),
                "transaction_time": parse_time(items["TransactionDate"]),
                "company": settings.company,
            }
        )
        transaction = record_transaction({"checkout_request_id": body["CheckoutRequestID"]}, values)
        settle(transaction, settings)
        return ACCEPTED

    return run_as_administrator(run)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def c2b_validation(token=None, **kwargs):
    def run():
        authorize_callback(frappe.get_doc("M-Pesa Settings"), token)
        payload = parse_payload()
        invoice = payload.get("BillRefNumber")
        if invoice and not frappe.db.exists("Sales Invoice", invoice):
            return REJECTED
        return ACCEPTED

    return run_as_administrator(run)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def c2b_confirmation(token=None, **kwargs):
    def run():
        settings = frappe.get_doc("M-Pesa Settings")
        authorize_callback(settings, token)
        payload = parse_payload()
        receipt = payload["TransID"]
        if frappe.db.exists("M-Pesa Transaction", {"receipt_number": receipt}):
            return ACCEPTED
        transaction = record_transaction(
            {"receipt_number": receipt},
            {
                "transaction_type": "C2B",
                "status": "Completed",
                "amount": payload["TransAmount"],
                "phone_number": payload.get("MSISDN"),
                "bill_ref_number": payload.get("BillRefNumber"),
                "first_name": payload.get("FirstName"),
                "middle_name": payload.get("MiddleName"),
                "last_name": payload.get("LastName"),
                "transaction_time": parse_time(payload["TransTime"]),
                "company": settings.company,
                "raw_payload": json.dumps(payload),
            },
        )
        settle(transaction, settings)
        return ACCEPTED

    return run_as_administrator(run)


def record_result(transaction_type, token):
    def run():
        settings = frappe.get_doc("M-Pesa Settings")
        authorize_callback(settings, token)
        payload = parse_payload()
        result = payload["Result"]
        parameters = {
            row["Key"]: row.get("Value") for row in (result.get("ResultParameters") or {}).get("ResultParameter", [])
        }
        success = str(result.get("ResultCode")) == "0"
        record_transaction(
            {"originator_conversation_id": result["OriginatorConversationID"]},
            {
                "transaction_type": transaction_type,
                "status": "Completed" if success else "Failed",
                "conversation_id": result.get("ConversationID"),
                "receipt_number": result.get("TransactionID") if success and transaction_type == "B2C" else None,
                "amount": parameters.get("TransactionAmount"),
                "result_code": str(result.get("ResultCode")),
                "result_desc": result.get("ResultDesc"),
                "company": settings.company,
                "raw_payload": json.dumps(payload),
            },
        )
        return ACCEPTED

    return run_as_administrator(run)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def b2c_result(token=None, **kwargs):
    return record_result("B2C", token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def b2c_timeout(token=None, **kwargs):
    return record_result("B2C", token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def status_result(token=None, **kwargs):
    return record_result("Transaction Status", token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def status_timeout(token=None, **kwargs):
    return record_result("Transaction Status", token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def reversal_result(token=None, **kwargs):
    return record_result("Reversal", token)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def reversal_timeout(token=None, **kwargs):
    return record_result("Reversal", token)
