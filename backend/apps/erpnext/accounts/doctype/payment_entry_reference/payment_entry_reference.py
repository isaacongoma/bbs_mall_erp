import frappe
from frappe.model.document import Document


class PaymentEntryReference(Document):


    doctype = 'Payment Entry Reference'

    @property
    def payment_request_outstanding(self):
        if not self.payment_request:
            return

        return frappe.db.get_value("Payment Request", self.payment_request, "outstanding_amount")
