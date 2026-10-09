

import frappe
from frappe.model.document import Document
from frappe.model.rename_doc import bulk_rename
from frappe.utils.deprecations import deprecated


class RenameTool(Document):


    doctype = 'Rename Tool'

    pass


@frappe.whitelist()
@deprecated
def get_doctypes():
    frappe.has_permission("Rename Tool", throw=True)

    return frappe.get_all(
        "DocType", filters={"allow_rename": 1, "module": ["!=", "Core"]}, order_by="name", pluck="name"
    )


@frappe.whitelist()
def upload(select_doctype: str | None = None):
    from frappe.utils.csvutils import read_csv_content_from_attached_file

    if not select_doctype:
        select_doctype = frappe.form_dict.select_doctype

    if not frappe.has_permission(select_doctype, "write"):
        raise frappe.PermissionError

    rows = read_csv_content_from_attached_file(frappe.get_doc("Rename Tool", "Rename Tool"))

    for i in range(0, len(rows), 500):
        frappe.enqueue(
            method=bulk_rename,
            queue="long",
            doctype=select_doctype,
            rows=rows[i : i + 500],
        )
