import frappe


def execute():
    rows = frappe.get_all(
        "POS Search Fields", filters={"parent": "POS Settings"}, fields=["name", "field", "fieldname"]
    )

    for row in rows:
        if not (row.field and row.fieldname) or row.field.endswith(f"({row.fieldname})"):
            continue

        frappe.db.set_value(
            "POS Search Fields",
            row.name,
            "field",
            f"{row.field} ({row.fieldname})",
            update_modified=False,
        )
