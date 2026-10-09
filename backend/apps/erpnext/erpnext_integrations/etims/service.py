import base64
import json
from io import BytesIO

import frappe
from frappe import _
from frappe.utils import now_datetime

from erpnext.erpnext_integrations.etims.oscu import OscuProvider, requests_post
from erpnext.erpnext_integrations.etims.payloads import (
    build_purchase_payload,
    build_sales_payload,
    build_stock_movement_payload,
)
from erpnext.erpnext_integrations.etims.provider import EtimsError

HTTP = {"call": requests_post}


def get_active_settings(company):
    name = frappe.db.get_value("eTIMS Settings", {"company": company, "is_active": 1})
    return frappe.get_doc("eTIMS Settings", name) if name else None


def get_provider(settings):
    return OscuProvider(settings, http=HTTP["call"])


def document_type_for(doc):
    if doc.doctype == "Sales Invoice":
        return "Credit Note" if doc.is_return else "Sales Invoice"
    if doc.doctype == "Purchase Invoice":
        return "Purchase Invoice"
    return "Stock Movement"


def get_or_create_submission(doc, settings):
    name = frappe.db.get_value("eTIMS Submission", {"reference_doctype": doc.doctype, "reference_name": doc.name})
    if name:
        return frappe.get_doc("eTIMS Submission", name)
    return frappe.get_doc(
        {
            "doctype": "eTIMS Submission",
            "reference_doctype": doc.doctype,
            "reference_name": doc.name,
            "document_type": document_type_for(doc),
            "company": doc.company,
            "settings": settings.name,
            "status": "Pending",
        }
    ).insert(ignore_permissions=True)


def qr_png_data_uri(url):
    import qrcode

    buffer = BytesIO()
    qrcode.make(url).save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def submit_document(doctype, name, force=False):
    doc = frappe.get_doc(doctype, name)
    settings = get_active_settings(doc.company)
    if not settings:
        return None
    submission = get_or_create_submission(doc, settings)
    if submission.status == "Submitted" and not force:
        return submission
    provider = get_provider(settings)
    if doc.doctype == "Sales Invoice":
        payload = build_sales_payload(doc, settings)
        send = provider.submit_credit_note if doc.is_return else provider.submit_sales_invoice
    elif doc.doctype == "Purchase Invoice":
        payload = build_purchase_payload(doc, settings)
        send = provider.submit_purchase
    else:
        payload = build_stock_movement_payload(doc, settings)
        send = provider.submit_stock_movement
    submission.request_body = json.dumps(payload)
    submission.attempts = (submission.attempts or 0) + 1
    submission.last_attempt_on = now_datetime()
    try:
        response = send(payload)
    except EtimsError as error:
        submission.status = "Failed"
        submission.result_code = error.code
        submission.result_message = str(error)
        submission.response_body = json.dumps(error.response) if error.response is not None else None
        submission.save(ignore_permissions=True)
        return submission
    except OSError as error:
        submission.status = "Failed"
        submission.result_code = "NETWORK"
        submission.result_message = str(error)
        submission.save(ignore_permissions=True)
        return submission
    record_success(doc, submission, provider, settings, response)
    return submission


def record_success(doc, submission, provider, settings, response):
    data = response.get("data") or {}
    submission.status = "Submitted"
    submission.result_code = response.get("resultCd")
    submission.result_message = response.get("resultMsg")
    submission.response_body = json.dumps(response)
    values = {}
    if doc.doctype == "Sales Invoice":
        signature = data.get("rcptSign")
        qr_url = provider.receipt_qr_url(settings.tin, settings.branch_id, signature)
        submission.receipt_number = data.get("curRcptNo")
        submission.total_receipt_number = data.get("totRcptNo")
        submission.internal_data = data.get("intrlData")
        submission.receipt_signature = signature
        submission.scu_id = data.get("sdcId") or settings.scu_id
        submission.scu_datetime = data.get("sdcDateTime")
        submission.qr_url = qr_url
        values = {
            "etims_receipt_number": data.get("curRcptNo"),
            "etims_total_receipt_number": data.get("totRcptNo"),
            "etims_internal_data": data.get("intrlData"),
            "etims_receipt_signature": signature,
            "etims_scu_id": submission.scu_id,
            "etims_scu_datetime": data.get("sdcDateTime"),
            "etims_qr_url": qr_url,
        }
    values["etims_submission"] = submission.name
    values["etims_submitted"] = 1
    submission.save(ignore_permissions=True)
    frappe.db.set_value(doc.doctype, doc.name, values)


def on_submit_invoice(doc, method=None):
    if not get_active_settings(doc.company):
        return
    if doc.get("etims_defer_submission"):
        return
    frappe.enqueue(
        "erpnext.erpnext_integrations.etims.service.submit_document",
        queue="default",
        timeout=300,
        job_name=f"{doc.name}_etims_submit",
        doctype=doc.doctype,
        name=doc.name,
    )


def before_cancel_invoice(doc, method=None):
    if frappe.db.get_value(doc.doctype, doc.name, "etims_submitted"):
        frappe.throw(
            _(
                "This document has already been submitted to eTIMS and cannot be cancelled. Create a credit note (sales) or debit note (purchase) instead."
            )
        )


def retry_failed_submissions():
    for row in frappe.get_all(
        "eTIMS Submission",
        filters={"status": "Failed"},
        fields=["name", "reference_doctype", "reference_name", "attempts", "settings"],
    ):
        max_attempts = frappe.db.get_value("eTIMS Settings", row.settings, "max_attempts") or 5
        if (row.attempts or 0) >= max_attempts:
            continue
        submit_document(row.reference_doctype, row.reference_name)


def initialize_device(settings_name):
    settings = frappe.get_doc("eTIMS Settings", settings_name)
    response = get_provider(settings).initialize_device()
    info = (response.get("data") or {}).get("info") or {}
    settings.scu_id = info.get("sdcId")
    settings.mrc_no = info.get("mrcNo")
    if info.get("cmcKey"):
        settings.communication_key = info["cmcKey"]
    settings.initialized_on = now_datetime()
    settings.save(ignore_permissions=True)
    return settings
