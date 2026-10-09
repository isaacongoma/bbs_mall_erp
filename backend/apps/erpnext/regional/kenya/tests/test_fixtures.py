from django.test import TestCase

import frappe
from apps.erpnext.regional.kenya.data import VAT_RATES, WITHHOLDING_CATEGORIES
from apps.erpnext.regional.kenya.setup import setup
from apps.frappe import exceptions
from apps.erpnext.registry import get_model
from apps.frappe.runtime import new_doc, session


class KenyaFixtureTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        company = new_doc("Company")
        company.company_name = "Kenya Fixture Ltd"
        company.abbr = "KFL"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        setup(self.company)

    def test_setup_is_idempotent(self):
        before = frappe.db.count("Tax Withholding Category")
        setup(self.company)
        self.assertEqual(frappe.db.count("Tax Withholding Category"), before)

    def test_vat_templates_have_exact_rates(self):
        for title, rate in VAT_RATES:
            sales = frappe.get_doc("Sales Taxes and Charges Template", f"{title} - KFL")
            purchase = frappe.get_doc("Purchase Taxes and Charges Template", f"{title} - KFL")
            self.assertEqual([row.rate for row in sales.taxes], [rate])
            self.assertEqual([row.rate for row in purchase.taxes], [rate])
            self.assertEqual(sales.taxes[0].account_head, "Output VAT - KFL")
            self.assertEqual(purchase.taxes[0].account_head, "Input VAT - KFL")

    def test_withholding_categories(self):
        for name, rate, threshold in WITHHOLDING_CATEGORIES:
            doc = frappe.get_doc("Tax Withholding Category", name)
            self.assertEqual(doc.rates[0].tax_withholding_rate, rate)
            self.assertEqual(doc.rates[0].single_threshold, threshold)
            self.assertIn(self.company, [row.company for row in doc.accounts])

    def test_kra_pin_validation(self):
        customer = new_doc("Customer")
        customer.customer_name = "Pin Customer"
        customer.customer_type = "Company"
        customer.kra_pin = "bad"
        with self.assertRaises(exceptions.ValidationError):
            customer.insert()
        customer.kra_pin = "a123456789z"
        customer.insert()
        self.assertEqual(frappe.db.get_value("Customer", customer.name, "kra_pin"), "A123456789Z")

    def test_sales_invoice_with_kenya_vat_template_posts_exact_gl(self):
        for doctype, field, value in (
            ("Customer", "customer_name", "VAT Customer"),
            ("Price List", "price_list_name", "Standard Selling"),
        ):
            doc = new_doc(doctype)
            setattr(doc, field, value)
            if doctype == "Customer":
                doc.customer_type = "Company"
            else:
                doc.currency = "KES"
                doc.selling = 1
                doc.enabled = 1
            doc.insert(ignore_if_duplicate=True)
        item = new_doc("Item")
        item.item_code = "KE-SERVICE"
        item.item_name = "Service"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.is_stock_item = 0
        item.insert()
        if not frappe.db.exists("Fiscal Year", {"year_start_date": ("<=", "2026-10-03"), "year_end_date": (">=", "2026-10-03")}):
            fiscal_year = new_doc("Fiscal Year")
            fiscal_year.year = "2026"
            fiscal_year.year_start_date = "2026-01-01"
            fiscal_year.year_end_date = "2026-12-31"
            fiscal_year.insert()
        invoice = new_doc("Sales Invoice")
        invoice.customer = "VAT Customer"
        invoice.company = self.company
        invoice.debit_to = "Debtors - KFL"
        invoice.set_posting_time = 1
        invoice.posting_date = "2026-10-03"
        invoice.due_date = "2026-10-31"
        invoice.currency = "KES"
        invoice.selling_price_list = "Standard Selling"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.taxes_and_charges = "Kenya VAT 16% - KFL"
        invoice.append("items", {"item_code": "KE-SERVICE", "qty": 1, "rate": 10000, "income_account": "Sales - KFL"})
        invoice.set_missing_values()
        invoice.calculate_taxes_and_totals()
        invoice.insert()
        self.assertEqual([(row.account_head, row.rate, row.tax_amount) for row in invoice.taxes], [("Output VAT - KFL", 16, 1600)])
        self.assertEqual(invoice.grand_total, 11600)
        invoice.submit()
        entries = sorted(
            (e.account, float(e.debit), float(e.credit))
            for e in get_model("GL Entry").objects.filter(voucher_no=invoice.name, is_cancelled=0)
        )
        self.assertEqual(
            entries,
            [("Debtors - KFL", 11600.0, 0.0), ("Output VAT - KFL", 0.0, 1600.0), ("Sales - KFL", 0.0, 10000.0)],
        )
