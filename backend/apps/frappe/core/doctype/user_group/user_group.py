import frappe

from frappe.model.document import Document


class UserGroup(Document):
    doctype = 'User Group'

    _DOCTYPE_NAME = "User Group"


    def after_insert(self):
        frappe.cache.delete_key("user_groups")

    def on_trash(self):
        frappe.cache.delete_key("user_groups")
