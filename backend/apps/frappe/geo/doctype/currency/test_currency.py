import frappe
from frappe.tests import IntegrationTestCase


class TestUser(IntegrationTestCase):
    def test_default_currency_on_setup(self):
        usd = frappe.get_doc("Currency", "USD")
        self.assertDocumentEqual({"enabled": 1, "fraction": "Cent"}, usd)
