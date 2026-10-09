import frappe


def execute():
    for doctype in ("DocPerm", "Custom DocPerm"):
        flags = [
            df.fieldname
            for df in frappe.get_meta(doctype).fields
            if df.fieldtype == "Check" and df.fieldname != "if_owner"
        ]

        groups = frappe.get_all(
            doctype,
            filters={"permlevel": [">", 0], "if_owner": 1},
            fields=["parent", "role", "permlevel"],
            distinct=True,
        )

        for group in groups:
            rows = frappe.get_all(
                doctype,
                filters={"parent": group.parent, "role": group.role, "permlevel": group.permlevel},
                fields=["name", *flags],
                order_by="creation",
            )
            merged = {flag: 1 for flag in flags if any(row.get(flag) for row in rows)}
            merged["if_owner"] = 0
            frappe.db.set_value(doctype, rows[0].name, merged, update_modified=False)
            for row in rows[1:]:
                frappe.db.delete(doctype, {"name": row.name})
