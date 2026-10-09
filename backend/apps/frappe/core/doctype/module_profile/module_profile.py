from collections import defaultdict

import frappe
from frappe.model.document import Document


class ModuleProfile(Document):
    doctype = 'Module Profile'

    _DOCTYPE_NAME = "Module Profile"


    def onload(self):
        from frappe.utils.modules import get_modules_from_all_apps

        self.set_onload("all_modules", sorted(m.get("module_name") for m in get_modules_from_all_apps()))

    def get_permission_log_options(self, event=None):
        return {"fields": ["block_modules"]}

    def on_update(self):
        self.clear_cache()
        self.queue_action(
            "update_all_users",
            now=frappe.flags.in_test or frappe.flags.in_install,
            enqueue_after_commit=True,
        )

    def update_all_users(self):
        """Changes in module_profile reflected across all its user"""
        block_module = frappe.qb.DocType("Block Module")
        user = frappe.qb.DocType("User")

        all_current_modules = (
            frappe.qb.from_(user)
            .join(block_module)
            .on(user.name == block_module.parent)
            .where(user.module_profile == self.name)
            .select(user.name, block_module.module)
        ).run()
        user_modules = defaultdict(set)
        for user, module in all_current_modules:
            user_modules[user].add(module)

        module_profile_modules = {module.module for module in self.block_modules}

        for user_name, modules in user_modules.items():
            if modules != module_profile_modules:
                user = frappe.get_doc("User", user_name)
                user.block_modules = []
                for module in module_profile_modules:
                    user.append("block_modules", {"module": module})
                user.save()
