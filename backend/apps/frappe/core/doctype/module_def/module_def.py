import json

import frappe
from frappe import _
from apps.frappe.model.document import Document


class ModuleDef(Document):
    doctype = "Module Def"

    def validate(self):
        self.validate_placement()

    def validate_placement(self):
        if self.custom:
            if self.app_name and not frappe.flags.in_install:
                if self.app_name not in frappe.get_installed_apps():
                    self.app_name = None
            return

        if not self.app_name:
            from frappe.modules.utils import get_module_app

            self.app_name = get_module_app(self.name)

    def on_update(self):
        frappe.clear_cache()

    def before_rename(self, old, new, merge=False):
        if not self.custom:
            frappe.throw(_("Only Custom Modules can be renamed."))


@frappe.whitelist()
def get_installed_apps():
    return json.dumps(frappe.get_installed_apps())
