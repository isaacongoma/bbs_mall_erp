from decimal import Decimal

from django.test import TestCase

import frappe
from apps.erpnext.accounts.doctype.purchase_invoice.purchase_invoice import PurchaseInvoice
from apps.erpnext.registry import get_model
from apps.frappe.runtime import get_doc, new_doc, session


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


class PurchaseInvoiceParity(TestCase):
    def setUp(self):
        session.user = "Administrator"
        company = new_doc("Company")
        company.company_name = "BBS Mall Ltd"
        company.abbr = "BML"
        company.default_currency = "KES"
        company.country = "Kenya"
        company.chart_of_accounts = "Standard"
        company.insert()
        self.company = company.name
        supplier = new_doc("Supplier")
        supplier.supplier_name = "Cleaning Co"
        supplier.supplier_type = "Company"
        supplier.insert()
        self.supplier = supplier.name
        item = new_doc("Item")
        item.item_code = "CLEAN-001"
        item.item_name = "Cleaning Service"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.is_stock_item = 0
        item.insert()
        fiscal_year = new_doc("Fiscal Year")
        fiscal_year.year = "2026"
        fiscal_year.year_start_date = "2026-01-01"
        fiscal_year.year_end_date = "2026-12-31"
        fiscal_year.insert(ignore_if_duplicate=True)

    def make_invoice(self, rate=100000, qty=1):
        tax_account = frappe.db.get_value("Account", {"account_type": "Tax", "company": self.company, "is_group": 0}, "name")
        invoice = new_doc("Purchase Invoice")
        invoice.supplier = self.supplier
        invoice.company = self.company
        invoice.credit_to = "Creditors - BML"
        invoice.set_posting_time = 1
        invoice.posting_date = "2026-10-03"
        invoice.bill_no = "INV-9"
        invoice.bill_date = "2026-10-02"
        invoice.due_date = "2099-12-31"
        invoice.currency = "KES"
        invoice.conversion_rate = 1
        invoice.append(
            "items",
            {
                "item_code": "CLEAN-001",
                "qty": qty,
                "rate": rate,
                "expense_account": "Cost of Goods Sold - BML",
                "cost_center": "Main - BML",
            },
        )
        invoice.append(
            "taxes",
            {
                "category": "Total",
                "add_deduct_tax": "Add",
                "charge_type": "On Net Total",
                "account_head": tax_account,
                "description": "VAT 16%",
                "rate": 16,
                "cost_center": "Main - BML",
            },
        )
        invoice.set_missing_values()
        invoice.insert()
        return invoice

    def test_controller_class_is_resolved(self):
        invoice = self.make_invoice()
        self.assertIsInstance(get_doc("Purchase Invoice", invoice.name), PurchaseInvoice)

    def test_totals(self):
        invoice = self.make_invoice()
        self.assertEqual(money(invoice.net_total), money(100000))
        self.assertEqual(money(invoice.total_taxes_and_charges), money(16000))
        self.assertEqual(money(invoice.grand_total), money(116000))
        self.assertEqual(money(invoice.outstanding_amount), money(116000))

    def test_submit_posts_gl(self):
        invoice = self.make_invoice()
        invoice.submit()
        tax_account = frappe.db.get_value("Account", {"account_type": "Tax", "company": self.company, "is_group": 0}, "name")
        actual = sorted(
            (row.account, money(row.debit), money(row.credit), row.party or "")
            for row in get_model("GL Entry").objects.filter(voucher_no=invoice.name, is_cancelled=0)
        )
        expected = sorted(
            [
                ("Creditors - BML", money(0), money(116000), self.supplier),
                ("Cost of Goods Sold - BML", money(100000), money(0), ""),
                (tax_account, money(16000), money(0), ""),
            ]
        )
        self.assertEqual(actual, expected)

    def test_status_after_submit(self):
        invoice = self.make_invoice()
        invoice.submit()
        reloaded = get_doc("Purchase Invoice", invoice.name)
        self.assertEqual(reloaded.status, "Unpaid")
        self.assertEqual(money(reloaded.outstanding_amount), money(116000))

    def test_cancel_reverses_ledger(self):
        invoice = self.make_invoice()
        invoice.submit()
        invoice.cancel()
        net = {}
        for row in get_model("GL Entry").objects.filter(voucher_no=invoice.name):
            net[row.account] = net.get(row.account, Decimal(0)) + money(row.debit) - money(row.credit)
        self.assertTrue(all(value == 0 for value in net.values()))

    def test_payment_entry_settles(self):
        from apps.erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        invoice = self.make_invoice()
        invoice.submit()
        payment = get_payment_entry("Purchase Invoice", invoice.name, bank_account="Cash - BML")
        payment.reference_no = "TRF-1"
        payment.reference_date = "2026-10-03"
        payment.insert()
        payment.submit()
        reloaded = get_doc("Purchase Invoice", invoice.name)
        self.assertEqual(money(reloaded.outstanding_amount), money(0))
        self.assertEqual(reloaded.status, "Paid")

    def test_debit_note_is_a_return(self):
        from apps.erpnext.controllers.sales_and_purchase_return import make_return_doc

        invoice = self.make_invoice()
        invoice.submit()
        debit_note = make_return_doc("Purchase Invoice", invoice.name)
        debit_note.insert()
        debit_note.submit()
        self.assertEqual(money(debit_note.grand_total), money(-116000))
