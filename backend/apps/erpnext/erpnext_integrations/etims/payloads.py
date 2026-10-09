from datetime import timedelta

import frappe
from frappe.utils import flt, get_datetime

TAX_TYPES = {
    "A": 0.0,
    "B": 16.0,
    "C": 0.0,
    "D": 0.0,
    "E": 8.0,
}

TREATMENT_TO_TAX_TYPE = {
    "Exempt": "A",
    "Standard": "B",
    "Zero Rated": "C",
    "Fuel": "E",
}


def split_user_email(email):
    return (email or "").split("@")[0]


def get_invoice_number(invoice_name):
    parts = invoice_name.split("-")
    if len(parts) >= 3:
        return int(parts[-1])
    raise ValueError("Invoice name format is incorrect")


def item_details(item_code):
    values = frappe.db.get_value(
        "Item",
        item_code,
        [
            "kenya_vat_treatment",
            "etims_item_code",
            "etims_item_class_code",
            "etims_packaging_unit_code",
            "etims_quantity_unit_code",
        ],
        as_dict=True,
    ) or frappe._dict()
    return frappe._dict(
        tax_type=TREATMENT_TO_TAX_TYPE.get(values.get("kenya_vat_treatment") or "Standard", "B"),
        item_code=values.get("etims_item_code") or item_code,
        class_code=values.get("etims_item_class_code"),
        packaging_unit=values.get("etims_packaging_unit_code") or "NT",
        quantity_unit=values.get("etims_quantity_unit_code") or "U",
    )


def posting_datetime(doc):
    time = doc.posting_time
    if isinstance(time, timedelta):
        time = str(time)
    return get_datetime(f"{doc.posting_date} {str(time)[:8]}")


def build_items(doc, sign=1):
    items = []
    totals = {key: {"taxable": 0.0, "tax": 0.0} for key in TAX_TYPES}
    for item in doc.items:
        details = item_details(item.item_code)
        rate = TAX_TYPES[details.tax_type]
        net = abs(flt(item.net_amount, 2))
        tax = flt(net * rate / 100, 2)
        totals[details.tax_type]["taxable"] += net
        totals[details.tax_type]["tax"] += tax
        items.append(
            {
                "itemSeq": item.idx,
                "itemCd": details.item_code,
                "itemClsCd": details.class_code,
                "itemNm": item.item_name,
                "bcd": item.get("barcode") or None,
                "pkgUnitCd": details.packaging_unit,
                "pkg": 1,
                "qtyUnitCd": details.quantity_unit,
                "qty": abs(flt(item.qty)),
                "prc": abs(flt(item.base_rate, 2)),
                "splyAmt": abs(flt(item.base_amount, 2)),
                "dcRt": flt(item.discount_percentage, 2) or 0,
                "dcAmt": flt(item.discount_amount, 2) or 0,
                "taxTyCd": details.tax_type,
                "taxblAmt": net,
                "taxAmt": tax,
                "totAmt": flt(net + tax, 2),
            }
        )
    return items, totals


def tax_summary(totals):
    summary = {}
    for key, rate in TAX_TYPES.items():
        summary[f"taxRt{key}"] = rate
        summary[f"taxAmt{key}"] = flt(totals[key]["tax"], 2)
        summary[f"taxblAmt{key}"] = flt(totals[key]["taxable"], 2)
    return summary


def customer_tin(doc):
    return doc.get("tax_id") or frappe.db.get_value("Customer", doc.customer, "kra_pin") or None


def build_sales_payload(doc, settings):
    is_credit_note = bool(doc.is_return)
    items, totals = build_items(doc)
    stamp = posting_datetime(doc).strftime("%Y%m%d%H%M%S")
    sales_date = stamp[:8]
    summary = tax_summary(totals)
    tin = customer_tin(doc)
    payload = {
        "invcNo": get_invoice_number(doc.name),
        "orgInvcNo": get_invoice_number(doc.return_against) if is_credit_note else 0,
        "trdInvcNo": doc.name,
        "custTin": tin,
        "custNm": None,
        "rcptTyCd": "R" if is_credit_note else "S",
        "pmtTyCd": settings.payment_type_code,
        "salesSttsCd": settings.sales_status_code,
        "cfmDt": stamp,
        "salesDt": sales_date,
        "stockRlsDt": stamp,
        "cnclReqDt": None,
        "cnclDt": None,
        "rfdDt": None,
        "rfdRsnCd": None,
        "totItemCnt": len(items),
        **summary,
        "totTaxblAmt": flt(abs(doc.base_net_total), 2),
        "totTaxAmt": flt(sum(totals[key]["tax"] for key in totals), 2),
        "totAmt": flt(abs(doc.grand_total), 2),
        "prchrAcptcYn": "Y",
        "remark": None,
        "regrId": split_user_email(doc.owner),
        "regrNm": doc.owner,
        "modrId": split_user_email(doc.modified_by),
        "modrNm": doc.modified_by,
        "receipt": {
            "custTin": tin,
            "custMblNo": None,
            "rptNo": 1,
            "rcptPbctDt": stamp,
            "trdeNm": "",
            "adrs": "",
            "topMsg": "ERPNext",
            "btmMsg": "",
            "prchrAcptcYn": "Y",
        },
        "itemList": items,
    }
    return payload


def build_purchase_payload(doc, settings):
    items, totals = build_items(doc)
    for row in items:
        row.update({"spplrItemClsCd": None, "spplrItemCd": None, "spplrItemNm": None, "itemExprDt": None})
        row.pop("bcd", None)
        row["bcd"] = ""
    summary = tax_summary(totals)
    return {
        "invcNo": get_invoice_number(doc.name),
        "orgInvcNo": 0,
        "spplrTin": doc.get("tax_id") or frappe.db.get_value("Supplier", doc.supplier, "kra_pin"),
        "spplrBhfId": doc.get("etims_supplier_branch_id") or "00",
        "spplrNm": doc.supplier,
        "spplrInvcNo": doc.bill_no,
        "regTyCd": "A",
        "pchsTyCd": settings.purchase_type_code,
        "rcptTyCd": settings.purchase_receipt_type_code,
        "pmtTyCd": settings.payment_type_code,
        "pchsSttsCd": settings.purchase_status_code,
        "cfmDt": None,
        "pchsDt": str(doc.posting_date).replace("-", ""),
        "wrhsDt": None,
        "cnclReqDt": "",
        "cnclDt": "",
        "rfdDt": None,
        "totItemCnt": len(items),
        **summary,
        "totTaxblAmt": flt(doc.base_net_total, 2),
        "totTaxAmt": flt(sum(totals[key]["tax"] for key in totals), 2),
        "totAmt": flt(doc.grand_total, 2),
        "remark": None,
        "regrNm": doc.owner,
        "regrId": split_user_email(doc.owner),
        "modrNm": doc.modified_by,
        "modrId": split_user_email(doc.modified_by),
        "itemList": items,
    }


def build_stock_movement_payload(doc, settings, movement_type_code="11"):
    items = []
    for item in doc.items:
        details = item_details(item.item_code)
        items.append(
            {
                "itemSeq": item.idx,
                "itemCd": details.item_code,
                "itemClsCd": details.class_code,
                "itemNm": item.item_name,
                "bcd": None,
                "pkgUnitCd": details.packaging_unit,
                "pkg": 1,
                "qtyUnitCd": details.quantity_unit,
                "qty": abs(flt(item.qty)),
                "itemExprDt": "",
                "prc": flt(item.basic_rate, 2),
                "splyAmt": flt(item.basic_rate, 2),
                "totDcAmt": 0,
                "taxTyCd": details.tax_type,
                "taxblAmt": 0,
                "taxAmt": 0,
                "totAmt": 0,
            }
        )
    stamp = get_datetime(f"{doc.posting_date} 00:00:00").strftime("%Y%m%d")
    return {
        "sarNo": get_invoice_number(doc.name),
        "orgSarNo": 0,
        "regTyCd": "M",
        "custTin": None,
        "custNm": None,
        "custBhfId": None,
        "sarTyCd": movement_type_code,
        "ocrnDt": stamp,
        "totItemCnt": len(items),
        "totTaxblAmt": 0,
        "totTaxAmt": 0,
        "totAmt": 0,
        "remark": None,
        "regrId": split_user_email(doc.owner),
        "regrNm": doc.owner,
        "modrId": split_user_email(doc.modified_by),
        "modrNm": doc.modified_by,
        "itemList": items,
    }
