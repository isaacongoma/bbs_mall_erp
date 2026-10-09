import json
import os

import frappe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_SYNCED = {"System Settings", "Global Defaults"}
SKIP = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "doctype"}


def run(only=None):
    with open(os.path.join(ROOT, "docs", "reference", "erpnext_cloud_singles.json"), encoding="utf8") as handle:
        data = json.load(handle)
    report = {}
    for doctype, values in data.items():
        if not values or (only and doctype not in only):
            continue
        meta = frappe.get_meta(doctype)
        changed = []
        for key, value in values.items():
            if key in SKIP or value is None or isinstance(value, (list, dict)):
                continue
            field = meta.get_field(key)
            if not field or field.fieldtype in ("Section Break", "Column Break", "Tab Break", "Table", "HTML", "Button"):
                continue
            if frappe.db.get_single_value(doctype, key) != value:
                frappe.db.set_single_value(doctype, key, value)
                changed.append(key)
            if doctype in DEFAULT_SYNCED:
                frappe.db.set_default(key, value)
        report[doctype] = changed
    frappe.db.commit()
    frappe.clear_cache()
    return report
