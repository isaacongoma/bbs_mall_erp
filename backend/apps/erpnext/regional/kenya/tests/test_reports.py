from django.test import TestCase

import frappe
from apps.erpnext.regional.kenya.setup import setup
from apps.erpnext.regional.report.kenya_vat_return.kenya_vat_return import execute as vat_return
from apps.erpnext.regional.report.kenya_withholding_certificate.kenya_withholding_certificate import (
    execute as withholding_certificate,
)
from apps.frappe import exceptions
from apps.frappe.runtime import new_doc, session


def ensure(doctype, **values):
    title = values.get("price_list_name") or values.get("customer_name") or values.get("supplier_name") or values.get("item_code")
    existing = frappe.db.exists(doctype, title) if title else None
    if existing:
        return frappe.get_doc(doctype, existing)
    doc = new_doc(doctype)
    for key, value in values.items():
        setattr(doc, key, value)
    doc.insert()
    return doc


class KenyaReportTests(TestCase):
    def setUp(self):
        session.user = "Administrator"
        company = new_doc("Company")
        company.company_name = "Kenya Report Ltd"
        company.abbr = "KRL"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        setup(self.company)
        if not frappe.db.exists("Fiscal Year", {"year_start_date": ("<=", "2026-10-03"), "year_end_date": (">=", "2026-10-03")}):
            ensure("Fiscal Year", year="2026", year_start_date="2026-01-01", year_end_date="2026-12-31")
        ensure("Price List", price_list_name="Standard Selling", currency="KES", selling=1, enabled=1)
        ensure("Price List", price_list_name="Standard Buying", currency="KES", buying=1, enabled=1)
        self.customer = ensure("Customer", customer_name="Report Customer", customer_type="Company").name
        self.supplier = ensure("Supplier", supplier_name="Report Supplier", supplier_type="Company").name
        ensure(
            "Item",
            item_code="KE-REPORT-SERVICE",
            item_name="Report Service",
            item_group="All Item Groups",
            stock_uom="Nos",
            is_stock_item=0,
        )

    def make_sales_invoice(self, template, rate, posting_date="2026-10-03"):
        invoice = new_doc("Sales Invoice")
        invoice.customer = self.customer
        invoice.company = self.company
        invoice.debit_to = "Debtors - KRL"
        invoice.set_posting_time = 1
        invoice.posting_date = posting_date
        invoice.due_date = "2026-12-31"
        invoice.currency = "KES"
        invoice.selling_price_list = "Standard Selling"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.taxes_and_charges = template
        invoice.append(
            "items",
            {"item_code": "KE-REPORT-SERVICE", "qty": 1, "rate": rate, "income_account": "Sales - KRL"},
        )
        invoice.set_missing_values()
        invoice.calculate_taxes_and_totals()
        invoice.insert()
        invoice.submit()
        return invoice

    def make_purchase_invoice(self, template, rate, posting_date="2026-10-04"):
        invoice = new_doc("Purchase Invoice")
        invoice.supplier = self.supplier
        invoice.company = self.company
        invoice.credit_to = "Creditors - KRL"
        invoice.set_posting_time = 1
        invoice.posting_date = posting_date
        invoice.bill_date = posting_date
        invoice.due_date = "2026-12-31"
        invoice.currency = "KES"
        invoice.buying_price_list = "Standard Buying"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.taxes_and_charges = template
        invoice.append(
            "items",
            {"item_code": "KE-REPORT-SERVICE", "qty": 1, "rate": rate, "expense_account": "Cost of Goods Sold - KRL"},
        )
        invoice.set_missing_values()
        invoice.calculate_taxes_and_totals()
        invoice.insert()
        invoice.submit()
        return invoice

    def rows_by_treatment(self, data, section):
        return {row["treatment"]: row for row in data if row.get("section") == section}

    def test_vat_return_buckets_output_and_input(self):
        self.make_sales_invoice("Kenya VAT 16% - KRL", 10000)
        self.make_sales_invoice("Kenya VAT 0% Zero Rated - KRL", 5000)
        self.make_purchase_invoice("Kenya VAT 16% - KRL", 4000)

        columns, data, _message, _chart, summary = vat_return(
            {"company": self.company, "from_date": "2026-10-01", "to_date": "2026-10-31"}
        )
        self.assertTrue(columns)

        output = self.rows_by_treatment(data, "Output")
        self.assertEqual(output["Standard Rated 16%"]["net_amount"], 10000)
        self.assertEqual(output["Standard Rated 16%"]["vat_amount"], 1600)
        self.assertEqual(output["Zero Rated"]["net_amount"], 5000)
        self.assertEqual(output["Zero Rated"]["vat_amount"], 0)
        self.assertEqual(output["Total Output"]["vat_amount"], 1600)

        incoming = self.rows_by_treatment(data, "Input")
        self.assertEqual(incoming["Standard Rated 16%"]["vat_amount"], 640)
        self.assertEqual(incoming["Total Input"]["net_amount"], 4000)

        net = self.rows_by_treatment(data, "Net")["VAT Payable (Output - Input)"]
        self.assertEqual(net["vat_amount"], 960)
        self.assertEqual([item["value"] for item in summary], [1600, 640, 960])

    def test_vat_return_respects_period(self):
        self.make_sales_invoice("Kenya VAT 16% - KRL", 10000, posting_date="2026-09-30")
        self.make_sales_invoice("Kenya VAT 16% - KRL", 2000, posting_date="2026-10-01")

        _columns, data, _message, _chart, _summary = vat_return(
            {"company": self.company, "from_date": "2026-10-01", "to_date": "2026-10-31"}
        )
        self.assertEqual(self.rows_by_treatment(data, "Output")["Total Output"]["net_amount"], 2000)

    def test_vat_return_validates_filters(self):
        with self.assertRaises(exceptions.ValidationError):
            vat_return({"company": self.company, "from_date": "2026-11-01", "to_date": "2026-10-01"})
        with self.assertRaises(exceptions.ValidationError):
            vat_return({"from_date": "2026-10-01", "to_date": "2026-10-31"})

    def test_withholding_certificate_totals_entries(self):
        category = "Kenya WHT Resident Contractual Fees"
        for date, amount, withheld in (("2026-10-05", 100000, 3000), ("2026-10-20", 50000, 1500)):
            entry = new_doc("Tax Withholding Entry")
            entry.company = self.company
            entry.party_type = "Supplier"
            entry.party = self.supplier
            entry.tax_withholding_category = category
            entry.tax_rate = 3
            entry.taxable_amount = amount
            entry.withholding_amount = withheld
            entry.withholding_date = date
            entry.taxable_date = date
            entry.status = "Settled"
            entry.insert(ignore_permissions=True, ignore_mandatory=True)

        _columns, data = withholding_certificate(
            {"company": self.company, "from_date": "2026-10-01", "to_date": "2026-10-31"}
        )
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["certificate_no"], "WHT-KRL-" + self.supplier.replace(" ", "") + "-2026-10-01-2026-10-31")
        self.assertEqual(data[-1]["taxable_amount"], 150000)
        self.assertEqual(data[-1]["withholding_amount"], 4500)

        _columns, filtered = withholding_certificate(
            {
                "company": self.company,
                "from_date": "2026-10-10",
                "to_date": "2026-10-31",
                "supplier": self.supplier,
            }
        )
        self.assertEqual(filtered[-1]["withholding_amount"], 1500)

    def test_withholding_certificate_empty_period(self):
        _columns, data = withholding_certificate(
            {"company": self.company, "from_date": "2026-01-01", "to_date": "2026-01-31"}
        )
        self.assertEqual(data, [])
