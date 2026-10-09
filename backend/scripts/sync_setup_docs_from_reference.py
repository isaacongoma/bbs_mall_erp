import json

import frappe
from django.db import transaction

DROP = ("owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype", "name")


def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k not in DROP and v is not None}
    if isinstance(value, list):
        return [clean(v) for v in value]
    return value


def run(path, doctypes=("Mode of Payment", "Account Category", "Financial Report Template", "Fiscal Year")):
    with open(path, encoding="utf8") as handle:
        data = json.load(handle)
    report = {}
    for doctype in doctypes:
        updated = 0
        for row in data.get(doctype, []):
            name = row["name"]
            payload = clean(row)
            payload["doctype"] = doctype
            if frappe.db.exists(doctype, name):
                doc = frappe.get_doc(doctype, name)
                doc.update({k: v for k, v in payload.items() if k != "doctype"})
            else:
                doc = frappe.get_doc({**payload, "name": name})
            doc.flags.ignore_links = True
            doc.flags.ignore_mandatory = True
            doc.flags.ignore_validate = True
            with transaction.atomic():
                doc.save(ignore_permissions=True) if not doc.is_new() else doc.insert(ignore_permissions=True)
            updated += 1
        report[doctype] = updated
    frappe.db.commit()
    frappe.clear_cache()
    return report
