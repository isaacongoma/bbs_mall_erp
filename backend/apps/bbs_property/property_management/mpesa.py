import base64
import json
import re
from datetime import datetime

import frappe
import requests
from frappe import _
from frappe.utils import add_to_date, cint, flt, getdate, now_datetime, nowdate

from apps.bbs_property.property_management.utils import get_settings

HOSTS = {"Sandbox": "https://sandbox.safaricom.co.ke", "Production": "https://api.safaricom.co.ke"}
PENDING_MINUTES = 30
MANAGERS = ("System Manager", "Property Manager")


def format_phone(phone):
    digits = re.sub(r"\D", "", str(phone or ""))
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9:
        return "254" + digits
    return None


def host(settings):
    return HOSTS.get(settings.mpesa_environment or "Sandbox", HOSTS["Sandbox"])


def configured(settings=None):
    settings = settings or get_settings()
    return bool(settings.mpesa_consumer_key and settings.get_password("mpesa_consumer_secret", raise_exception=False) and (settings.mpesa_shortcode or settings.mpesa_paybill or settings.mpesa_till))


def access_token(settings):
    response = requests.get(
        f"{host(settings)}/oauth/v1/generate?grant_type=client_credentials",
        auth=(settings.mpesa_consumer_key, settings.get_password("mpesa_consumer_secret")),
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["access_token"]


def callback_token(settings):
    return settings.get_password("mpesa_callback_token", raise_exception=False) or ""


def callback_url(settings, kind):
    base = (settings.mpesa_callback_url or frappe.utils.get_url()).rstrip("/")
    return f"{base}/api/property-mgmt/mpesa/{callback_token(settings)}/{kind}/"


def account_reference(customer, lease=None, unit=None, settings=None):
    settings = settings or get_settings()
    template = settings.account_reference_format or "{customer}"
    value = template.format(customer=customer, lease=lease or "", unit=unit or "")
    return value[:12] or customer[:12]


def stk_push(customer, phone, amount, invoice=None, lease=None):
    settings = get_settings()
    if not configured(settings):
        frappe.throw(_("M-Pesa is not configured. Ask the management office to complete Property Settings."))
    msisdn = format_phone(phone)
    if not msisdn:
        frappe.throw(_("Enter a valid Safaricom number, for example 0712345678."))
    amount = int(round(flt(amount)))
    if amount < 1:
        frappe.throw(_("Amount must be at least 1."))
    shortcode = settings.mpesa_shortcode or settings.mpesa_paybill or settings.mpesa_till
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{settings.get_password('mpesa_passkey')}{timestamp}".encode()).decode()
    transaction_type = "CustomerBuyGoodsOnline" if settings.mpesa_till and not settings.mpesa_paybill else "CustomerPayBillOnline"
    reference = invoice or account_reference(customer, lease, settings=settings)
    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": amount,
        "PartyA": msisdn,
        "PartyB": settings.mpesa_till or shortcode if transaction_type == "CustomerBuyGoodsOnline" else shortcode,
        "PhoneNumber": msisdn,
        "CallBackURL": callback_url(settings, "stk"),
        "AccountReference": str(reference)[:12],
        "TransactionDesc": _("Rent payment")[:20],
    }
    response = requests.post(
        f"{host(settings)}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {access_token(settings)}"},
        timeout=30,
    )
    body = response.json() if response.content else {}
    if response.status_code != 200 or body.get("ResponseCode") != "0":
        frappe.throw(body.get("errorMessage") or body.get("ResponseDescription") or _("M-Pesa could not start the payment."))
    doc = frappe.get_doc(
        {
            "doctype": "Mpesa Payment",
            "source": "STK Push",
            "status": "Pending",
            "amount": amount,
            "phone": msisdn,
            "customer": customer,
            "lease": lease,
            "sales_invoice": invoice,
            "account_reference": str(reference)[:12],
            "checkout_request_id": body.get("CheckoutRequestID"),
            "merchant_request_id": body.get("MerchantRequestID"),
            "result_description": body.get("CustomerMessage"),
        }
    )
    doc.insert(ignore_permissions=True)
    return {"payment": doc.name, "checkout_request_id": doc.checkout_request_id, "message": body.get("CustomerMessage")}


def metadata_value(items, name):
    for item in items or []:
        if item.get("Name") == name:
            return item.get("Value")
    return None


def parse_time(value):
    try:
        return datetime.strptime(str(value), "%Y%m%d%H%M%S")
    except ValueError:
        return now_datetime()


def handle_stk_callback(payload):
    callback = (payload.get("Body") or {}).get("stkCallback") or {}
    checkout = callback.get("CheckoutRequestID")
    name = frappe.db.get_value("Mpesa Payment", {"checkout_request_id": checkout})
    if not name:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    doc = frappe.get_doc("Mpesa Payment", name)
    if doc.status in ("Allocated", "Received"):
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    doc.raw_payload = json.dumps(payload)
    doc.result_description = callback.get("ResultDesc")
    if cint(callback.get("ResultCode")) != 0:
        doc.status = "Cancelled" if cint(callback.get("ResultCode")) == 1032 else "Failed"
        doc.save(ignore_permissions=True)
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    items = (callback.get("CallbackMetadata") or {}).get("Item") or []
    doc.transaction_id = metadata_value(items, "MpesaReceiptNumber")
    doc.amount = flt(metadata_value(items, "Amount")) or doc.amount
    doc.phone = str(metadata_value(items, "PhoneNumber") or doc.phone)
    doc.transaction_time = parse_time(metadata_value(items, "TransactionDate"))
    doc.status = "Received"
    doc.save(ignore_permissions=True)
    allocate_payment(doc.name)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


def handle_c2b(payload, source="C2B Paybill"):
    receipt = payload.get("TransID")
    if not receipt:
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    if frappe.db.exists("Mpesa Payment", {"transaction_id": receipt}):
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    doc = frappe.get_doc(
        {
            "doctype": "Mpesa Payment",
            "source": source,
            "status": "Received",
            "transaction_id": receipt,
            "amount": flt(payload.get("TransAmount")),
            "phone": str(payload.get("MSISDN") or ""),
            "payer_name": " ".join(filter(None, [payload.get("FirstName"), payload.get("MiddleName"), payload.get("LastName")])),
            "account_reference": payload.get("BillRefNumber"),
            "transaction_time": parse_time(payload.get("TransTime")),
            "raw_payload": json.dumps(payload),
        }
    )
    doc.insert(ignore_permissions=True)
    allocate_payment(doc.name)
    return {"ResultCode": 0, "ResultDesc": "Accepted"}


def match_customer(doc):
    if doc.customer:
        return doc.customer
    reference = (doc.account_reference or "").strip()
    if reference:
        if frappe.db.exists("Customer", reference):
            return reference
        invoice = frappe.db.get_value("Sales Invoice", reference, "customer")
        if invoice:
            return invoice
        lease = frappe.db.get_value("Lease Agreement", reference, "customer")
        if lease:
            return lease
        unit = frappe.db.get_value("Rentable Unit", {"unit_code": reference.upper()}, "current_tenant") or frappe.db.get_value("Rentable Unit", reference, "current_tenant")
        if unit:
            return unit
        by_name = frappe.db.get_value("Customer", {"customer_name": ["like", f"%{reference}%"]})
        if by_name:
            return by_name
    tail = re.sub(r"\D", "", doc.phone or "")[-9:]
    if len(tail) == 9:
        row = frappe.db.sql(
            """
            select dl.link_name from "tabContact" c
            join "tabDynamic Link" dl on dl.parent = c.name and dl.parenttype = 'Contact' and dl.link_doctype = 'Customer'
            where right(regexp_replace(coalesce(c.mobile_no, ''), '[^0-9]', '', 'g'), 9) = %s
               or right(regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g'), 9) = %s
            limit 1
            """,
            (tail, tail),
        )
        if row:
            return row[0][0]
        row = frappe.db.sql(
            """
            select name from "tabCustomer"
            where right(regexp_replace(coalesce(mobile_no, ''), '[^0-9]', '', 'g'), 9) = %s limit 1
            """,
            (tail,),
        )
        if row:
            return row[0][0]
    return None


def outstanding_invoices(customer, preferred=None):
    rows = frappe.get_all(
        "Sales Invoice",
        filters={"customer": customer, "docstatus": 1, "outstanding_amount": [">", 0]},
        fields=["name", "grand_total", "outstanding_amount", "due_date", "company", "is_lease_invoice"],
        order_by="due_date asc, posting_date asc, name asc",
    )
    if preferred:
        rows.sort(key=lambda row: 0 if row.name == preferred else 1)
    return rows


def allocate_payment(payment_name):
    doc = frappe.get_doc("Mpesa Payment", payment_name)
    if doc.payment_entry:
        return doc.payment_entry
    settings = get_settings()
    customer = match_customer(doc)
    if not customer:
        doc.db_set({"status": "Unmatched", "result_description": _("No tenant matched this payment. Allocate it manually.")})
        return None
    if not settings.mpesa_mode_of_payment or not settings.mpesa_clearing_account:
        doc.db_set({"customer": customer, "status": "Unmatched", "result_description": _("Set the M-Pesa mode of payment and receiving account in Property Settings.")})
        return None
    invoices = outstanding_invoices(customer, doc.sales_invoice)
    company = invoices[0].company if invoices else frappe.db.get_single_value("Property Settings", "default_company") or frappe.defaults.get_global_default("company")
    entry = frappe.new_doc("Payment Entry")
    entry.payment_type = "Receive"
    entry.company = company
    entry.posting_date = getdate(doc.transaction_time or nowdate())
    entry.mode_of_payment = settings.mpesa_mode_of_payment
    entry.party_type = "Customer"
    entry.party = customer
    entry.paid_to = settings.mpesa_clearing_account
    entry.paid_amount = flt(doc.amount)
    entry.received_amount = flt(doc.amount)
    entry.reference_no = doc.transaction_id or doc.name
    entry.reference_date = getdate(doc.transaction_time or nowdate())
    entry.remarks = _("M-Pesa {0} from {1}").format(doc.transaction_id, doc.phone)
    entry.setup_party_account_field()
    entry.set_missing_values()
    entry.paid_to = settings.mpesa_clearing_account
    entry.paid_to_account_currency = frappe.db.get_value("Account", entry.paid_to, "account_currency")
    remaining = flt(doc.amount)
    for invoice in invoices:
        if remaining <= 0:
            break
        allocated = min(remaining, flt(invoice.outstanding_amount))
        entry.append(
            "references",
            {
                "reference_doctype": "Sales Invoice",
                "reference_name": invoice.name,
                "due_date": invoice.due_date,
                "total_amount": invoice.grand_total,
                "outstanding_amount": invoice.outstanding_amount,
                "allocated_amount": allocated,
            },
        )
        remaining -= allocated
    entry.insert(ignore_permissions=True)
    entry.submit()
    first = entry.references[0].reference_name if entry.references else None
    doc.db_set({"customer": customer, "payment_entry": entry.name, "status": "Allocated", "sales_invoice": first or doc.sales_invoice})
    return entry.name


def expire_pending_payments():
    cutoff = add_to_date(now_datetime(), minutes=-PENDING_MINUTES)
    for name in frappe.get_all("Mpesa Payment", filters={"status": "Pending", "creation": ["<", cutoff]}, pluck="name"):
        frappe.db.set_value("Mpesa Payment", name, {"status": "Failed", "result_description": _("No response from M-Pesa")}, update_modified=False)


@frappe.whitelist()
def register_c2b_urls():
    frappe.only_for(MANAGERS)
    settings = get_settings()
    if not configured(settings):
        frappe.throw(_("Complete the M-Pesa settings first."))
    shortcode = settings.mpesa_paybill or settings.mpesa_till or settings.mpesa_shortcode
    response = requests.post(
        f"{host(settings)}/mpesa/c2b/v1/registerurl",
        json={
            "ShortCode": shortcode,
            "ResponseType": "Completed",
            "ConfirmationURL": callback_url(settings, "c2b"),
            "ValidationURL": callback_url(settings, "validate"),
        },
        headers={"Authorization": f"Bearer {access_token(settings)}"},
        timeout=30,
    )
    return response.json() if response.content else {}


@frappe.whitelist()
def get_callback_urls():
    frappe.only_for(MANAGERS)
    settings = get_settings()
    return {
        _("STK Push result"): callback_url(settings, "stk"),
        _("C2B Confirmation"): callback_url(settings, "c2b"),
        _("C2B Validation"): callback_url(settings, "validate"),
    }
