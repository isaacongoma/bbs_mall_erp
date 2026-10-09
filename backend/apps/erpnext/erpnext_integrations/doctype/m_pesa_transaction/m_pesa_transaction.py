import frappe
from frappe import _
from frappe.model.document import Document


class MPesaTransaction(Document):
    doctype = "M-Pesa Transaction"

    def validate(self):
        if self.receipt_number and frappe.db.exists(
            "M-Pesa Transaction", {"receipt_number": self.receipt_number, "name": ("!=", self.name)}
        ):
            frappe.throw(_("M-Pesa receipt {0} is already recorded").format(self.receipt_number))
