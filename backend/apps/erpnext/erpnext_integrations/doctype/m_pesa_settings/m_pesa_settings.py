import frappe
from frappe import _
from frappe.model.document import Document


class MPesaSettings(Document):
    doctype = "M-Pesa Settings"

    def validate(self):
        if self.enabled and not self.get("callback_base_url", "").startswith("https://"):
            frappe.throw(_("Callback Base URL must be an https URL"))
