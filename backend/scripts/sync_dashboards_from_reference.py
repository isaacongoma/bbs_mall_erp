import json
import os

import frappe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DROP = ("owner", "creation", "modified", "modified_by", "docstatus", "idx")


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k not in DROP and v is not None}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


def run():
    with open(os.path.join(ROOT, "docs", "reference", "erpnext_cloud_dashboards.json"), encoding="utf8") as handle:
        data = json.load(handle)
    report = {}
    for doctype in ("Number Card", "Dashboard Chart", "Dashboard"):
        created, failed = 0, []
        for row in data[doctype]:
            if frappe.db.exists(doctype, row["name"]):
                continue
            payload = clean(row)
            payload["doctype"] = doctype
            for child in payload.values():
                if isinstance(child, list):
                    for entry in child:
                        for key in ("name", "parent", "parentfield", "parenttype"):
                            entry.pop(key, None)
            try:
                doc = frappe.get_doc(payload)
                doc.flags.ignore_links = True
                doc.flags.ignore_mandatory = True
                doc.flags.ignore_validate = True
                doc.insert(ignore_permissions=True)
                created += 1
            except Exception as error:
                failed.append((row["name"], str(error)[:100]))
        frappe.db.commit()
        report[doctype] = (created, failed[:5])
    frappe.clear_cache()
    return report
