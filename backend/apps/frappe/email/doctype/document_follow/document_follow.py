import frappe
from frappe.model.document import Document


def get_permission_query_conditions(user):
    if not user:
        user = frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return None

    return f"""`tabDocument Follow`.`user` = {frappe.db.escape(user)}"""


def has_permission(doc, ptype="read", user=None):
    user = user or frappe.session.user

    if "System Manager" in frappe.get_roles(user):
        return True

    return doc.user == user


class DocumentFollow(Document):
    doctype = 'Document Follow'

    _DOCTYPE_NAME = "Document Follow"


    pass
