from __future__ import annotations

import frappe
from frappe.model.document import Document
from frappe.permissions import get_doctypes_with_read


class TagLink(Document):
    doctype = 'Tag Link'

    _DOCTYPE_NAME = "Tag Link"


    def clear_cache(self):
        super().clear_cache()
        if has_tags(self.document_type):
            frappe.client_cache.delete_value(f"doctype_has_tags::{self.document_type}")


def on_doctype_update():
    frappe.db.add_index("Tag Link", ["document_type", "document_name"])


def get_permission_query_conditions(user: str | None = None) -> str:
    user = user or frappe.session.user

    if user == "Administrator":
        return ""

    readable_doctypes = ", ".join(repr(dt) for dt in get_doctypes_with_read(user))
    if not readable_doctypes:
        return " 1 = 0 "

    return f""" `tabTag Link`.`document_type` in ({readable_doctypes}) """


def has_tags(doctype: str):
    """Short circuit checks for tags by first checking if users even uses tags"""

    def check_db():
        return frappe.db.exists("Tag Link", {"document_type": doctype})

    return frappe.client_cache.get_value(f"doctype_has_tags::{doctype}", generator=check_db)
