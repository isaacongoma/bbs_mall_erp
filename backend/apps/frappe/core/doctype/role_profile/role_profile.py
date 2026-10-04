from collections import defaultdict

import frappe
from frappe.model.document import Document


class RoleProfile(Document):
    doctype = 'Role Profile'

    _DOCTYPE_NAME = "Role Profile"


    def autoname(self):
        """set name as Role Profile name"""
        self.name = self.role_profile

    def on_update(self):
        self.clear_cache()
        self.queue_action(
            "update_all_users",
            now=frappe.in_test or frappe.flags.in_install,
            enqueue_after_commit=True,
            queue="long",
        )

    def update_all_users(self):
        """Changes in role_profile reflected across all its user"""
        users = frappe.get_all("User Role Profile", filters={"role_profile": self.name}, pluck="parent")
        for user in users:
            user = frappe.get_doc("User", user)
            user.save()

    def get_permission_log_options(self, event=None):
        return {"fields": ["roles"]}
