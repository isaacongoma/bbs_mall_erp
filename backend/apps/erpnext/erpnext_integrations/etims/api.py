import frappe
from frappe import _

from erpnext.erpnext_integrations.etims import service


@frappe.whitelist(methods=["POST"])
def initialize_device(settings):
    frappe.only_for(("System Manager", "Accounts Manager"))
    doc = service.initialize_device(settings)
    return {"scu_id": doc.scu_id, "mrc_no": doc.mrc_no}


@frappe.whitelist(methods=["POST"])
def resubmit(doctype, name):
    frappe.has_permission(doctype, "submit", name, throw=True)
    submission = service.submit_document(doctype, name)
    if not submission:
        frappe.throw(_("No active eTIMS Settings for this company"))
    return submission.as_dict()


@frappe.whitelist(methods=["POST"])
def sync_code_lists(settings):
    frappe.only_for(("System Manager", "Accounts Manager"))
    doc = frappe.get_doc("eTIMS Settings", settings)
    return service.get_provider(doc).fetch_code_lists()


@frappe.whitelist(methods=["POST"])
def sync_item_classifications(settings):
    frappe.only_for(("System Manager", "Accounts Manager"))
    doc = frappe.get_doc("eTIMS Settings", settings)
    return service.get_provider(doc).fetch_item_classifications()


@frappe.whitelist(methods=["POST"])
def register_item(settings, item_code):
    frappe.only_for(("System Manager", "Accounts Manager"))
    doc = frappe.get_doc("eTIMS Settings", settings)
    item = frappe.get_doc("Item", item_code)
    from erpnext.erpnext_integrations.etims.payloads import item_details, split_user_email

    details = item_details(item_code)
    payload = {
        "itemCd": details.item_code,
        "itemClsCd": details.class_code,
        "itemTyCd": "2",
        "itemNm": item.item_name,
        "itemStdNm": None,
        "orgnNatCd": "KE",
        "pkgUnitCd": details.packaging_unit,
        "qtyUnitCd": details.quantity_unit,
        "taxTyCd": details.tax_type,
        "btchNo": None,
        "bcd": None,
        "dftPrc": item.get("standard_rate") or 0,
        "grpPrcL1": None,
        "grpPrcL2": None,
        "grpPrcL3": None,
        "grpPrcL4": None,
        "grpPrcL5": None,
        "addInfo": None,
        "sftyQty": None,
        "isrcAplcbYn": "N",
        "useYn": "Y",
        "regrNm": item.owner,
        "regrId": split_user_email(item.owner),
        "modrNm": item.modified_by,
        "modrId": split_user_email(item.modified_by),
    }
    return service.get_provider(doc).register_item(payload)


@frappe.whitelist()
def get_receipt_qr(doctype, name):
    frappe.has_permission(doctype, "read", name, throw=True)
    url = frappe.db.get_value(doctype, name, "etims_qr_url")
    if not url:
        frappe.throw(_("This document has no eTIMS receipt"))
    return {"url": url, "image": service.qr_png_data_uri(url)}
