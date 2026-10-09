import frappe
from frappe import format
from frappe.tests import IntegrationTestCase


class TestFormatter(IntegrationTestCase):
    def test_currency_formatting(self):
        df = frappe._dict({"fieldname": "amount", "fieldtype": "Currency", "options": "currency"})

        doc = frappe._dict({"amount": 5})
        frappe.db.set_default("currency", "INR")

        self.assertEqual(format(100000, df, doc, format="#,###.##"), "₹ 100,000.00")

        doc.currency = "USD"
        self.assertEqual(format(100000, df, doc, format="#,###.##"), "$ 100,000.00")

        frappe.db.set_default("currency", None)
