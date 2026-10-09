import json
import os

import frappe

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SNAPSHOT = os.path.join(ROOT, "docs", "reference", "erpnext_cloud_customizations.json")
DOCTYPES = ("Custom Field", "Property Setter", "Custom DocPerm")
DROP = ("owner", "creation", "modified", "modified_by", "docstatus", "idx")


def ensure_modules(snapshot):
    modules = {row.get("module") for rows in snapshot.values() for row in rows if row.get("module")}
    for module in modules:
        if not frappe.db.exists("Module Def", module):
            frappe.get_doc({"doctype": "Module Def", "module_name": module, "app_name": "erpnext"}).insert(ignore_permissions=True)
    frappe.db.commit()


def relax_not_null():
    from django.db import connection

    fixed = 0
    with connection.cursor() as cursor:
        for field in frappe.get_all("Custom Field", fields=["dt", "fieldname"], limit_page_length=0):
            table = "tab" + field["dt"]
            cursor.execute(
                "select is_nullable from information_schema.columns where table_name = %s and column_name = %s",
                [table, field["fieldname"]],
            )
            row = cursor.fetchone()
            if row and row[0] == "NO":
                cursor.execute(f'alter table "{table}" alter column "{field["fieldname"]}" drop not null')
                fixed += 1
    return fixed


def run():
    with open(SNAPSHOT, encoding="utf8") as handle:
        snapshot = json.load(handle)
    ensure_modules({key: snapshot.get(key, []) for key in DOCTYPES})
    report = {}
    for doctype in DOCTYPES:
        created, skipped, failed = [], [], []
        for row in snapshot.get(doctype, []):
            if doctype == 'Custom DocPerm' and frappe.db.exists(doctype, {k: row.get(k) for k in ('parent', 'role', 'permlevel', 'select', 'read', 'write', 'create', 'delete', 'submit', 'cancel', 'amend', 'report', 'export', 'share', 'print', 'email') if row.get(k) is not None}):
                continue
            target = row.get("dt") if doctype == "Custom Field" else row.get("doc_type") or row.get("parent")
            if doctype == "Custom DocPerm":
                target = row.get("parent")
            if target and not frappe.db.exists("DocType", target):
                skipped.append((row["name"], target))
                continue
            if frappe.db.exists(doctype, row["name"]):
                continue
            data = {key: value for key, value in row.items() if key not in DROP and value is not None}
            data["doctype"] = doctype
            try:
                doc = frappe.get_doc(data)
                doc.flags.ignore_permissions = True
                doc.flags.ignore_validate = True
                doc.flags.ignore_mandatory = True
                doc.insert(ignore_permissions=True)
                created.append(row["name"])
            except Exception as error:
                failed.append((row["name"], str(error)[:120]))
        frappe.db.commit()
        report[doctype] = {"created": len(created), "skipped": skipped, "failed": failed[:10], "failed_count": len(failed), "reasons": sorted({reason for _, reason in failed})[:10]}
    report['relaxed'] = relax_not_null()
    frappe.clear_cache()
    return report


if __name__ == "__main__":
    frappe.set_user("Administrator")
    print(run())
