import frappe
from frappe import _
from frappe.model.document import Document


class MpesaPayment(Document):
    doctype = "Mpesa Payment"

    def validate(self):
        if self.transaction_id and frappe.db.exists("Mpesa Payment", {"transaction_id": self.transaction_id, "name": ["!=", self.name or ""]}):
            frappe.throw(_("Receipt {0} is already recorded.").format(self.transaction_id))

    @frappe.whitelist()
    def allocate(self):
        self.check_permission("write")
        from apps.bbs_property.property_management import mpesa

        return mpesa.allocate_payment(self.name)
