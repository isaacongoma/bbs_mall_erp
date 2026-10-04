import frappe
from frappe.model.document import Document


class PaymentGatewayAccount(Document):


    doctype = 'Payment Gateway Account'

    def autoname(self):
        abbr = frappe.db.get_value("Company", self.company, "abbr")
        self.name = self.payment_gateway + " - " + self.currency + " - " + abbr

    def validate(self):
        self.currency = frappe.get_cached_value("Account", self.payment_account, "account_currency")

        self.update_default_payment_gateway()
        self.set_as_default_if_not_set()

    def update_default_payment_gateway(self):
        if self.is_default:
            frappe.db.set_value(
                "Payment Gateway Account",
                {"is_default": 1, "name": ["!=", self.name], "company": self.company},
                "is_default",
                0,
            )

    def set_as_default_if_not_set(self):
        if not frappe.db.exists(
            "Payment Gateway Account", {"is_default": 1, "name": ("!=", self.name), "company": self.company}
        ):
            self.is_default = 1
