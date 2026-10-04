import json
from decimal import Decimal
from pathlib import Path

from django.test import TestCase

import frappe
from apps.erpnext.accounts.doctype.sales_invoice.sales_invoice import SalesInvoice
from apps.erpnext.registry import get_model
from apps.frappe.runtime import get_doc, new_doc, session

ORACLE = json.loads(
    (Path(__file__).resolve().parents[3] / "tests" / "oracle" / "sales_invoice_exclusive_vat.json").read_text(encoding="utf-8")
)


SCENARIOS = json.loads(
    (Path(__file__).resolve().parents[3] / "tests" / "oracle" / "si_scenarios.json").read_text(encoding="utf-8")
)
TOTAL_FIELDS = (
    "total",
    "net_total",
    "total_taxes_and_charges",
    "grand_total",
    "base_grand_total",
    "rounded_total",
    "rounding_adjustment",
    "outstanding_amount",
)


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


class SalesInvoiceParity(TestCase):
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

        customer = new_doc("Customer")
        customer.customer_name = "Tenant One"
        customer.customer_type = "Company"
        customer.insert()
        self.customer = customer.name

        item = new_doc("Item")
        item.item_code = "RENT-001"
        item.item_name = "Shop Rent"
        item.item_group = "All Item Groups"
        item.stock_uom = "Nos"
        item.is_stock_item = 0
        item.insert()

        price_list = new_doc("Price List")
        price_list.price_list_name = "Standard Selling"
        price_list.currency = "KES"
        price_list.selling = 1
        price_list.enabled = 1
        price_list.insert()

        fiscal_year = new_doc("Fiscal Year")
        fiscal_year.year = "2026"
        fiscal_year.year_start_date = "2026-01-01"
        fiscal_year.year_end_date = "2026-12-31"
        fiscal_year.insert(ignore_if_duplicate=True)

    def make_invoice(self, rate=100000, included=0, discount_percent=0, qty=1):
        tax_account = frappe.db.get_value("Account", {"account_type": "Tax", "company": self.company, "is_group": 0}, "name")
        invoice = new_doc("Sales Invoice")
        invoice.customer = self.customer
        invoice.company = self.company
        invoice.debit_to = "Debtors - BML"
        invoice.set_posting_time = 1
        invoice.posting_date = "2026-10-03"
        invoice.posting_time = "10:00:00"
        invoice.due_date = "2026-10-31"
        invoice.currency = "KES"
        invoice.selling_price_list = "Standard Selling"
        invoice.price_list_currency = "KES"
        invoice.plc_conversion_rate = 1
        invoice.conversion_rate = 1
        invoice.append("items", {"item_code": "RENT-001", "qty": qty, "rate": rate, "income_account": "Sales - BML"})
        invoice.append(
            "taxes",
            {
                "charge_type": "On Net Total",
                "account_head": tax_account,
                "description": "VAT 16%",
                "rate": 16,
                "included_in_print_rate": included,
            },
        )
        if discount_percent:
            invoice.apply_discount_on = "Net Total"
            invoice.additional_discount_percentage = discount_percent
        invoice.set_missing_values()
        invoice.insert()
        return invoice

    def test_controller_class_is_resolved(self):
        invoice = self.make_invoice()
        self.assertIsInstance(get_doc("Sales Invoice", invoice.name), SalesInvoice)

    def test_totals_match_the_oracle(self):
        invoice = self.make_invoice()
        expected = ORACLE["invoices"][0]
        self.assertEqual(money(invoice.net_total), money(expected["net_total"]))
        self.assertEqual(money(invoice.total_taxes_and_charges), money(expected["total_taxes_and_charges"]))
        self.assertEqual(money(invoice.grand_total), money(expected["grand_total"]))
        self.assertEqual(money(invoice.base_grand_total), money(expected["base_grand_total"]))
        self.assertEqual(money(invoice.outstanding_amount), money(expected["outstanding_amount"]))
        self.assertEqual(money(invoice.rounded_total), money(expected["rounded_total"]))
        self.assertEqual(money(invoice.rounding_adjustment), money(expected["rounding_adjustment"]))

    def test_submit_posts_the_same_gl_entries_as_the_oracle(self):
        invoice = self.make_invoice()
        invoice.submit()
        entries = get_model("GL Entry").objects.filter(voucher_no=invoice.name, is_cancelled=0)
        actual = sorted(
            (entry.account, money(entry.debit), money(entry.credit), entry.party_type or "", entry.party or "", entry.against or "")
            for entry in entries
        )
        expected = sorted(
            (
                row["account"],
                money(row["debit"]),
                money(row["credit"]),
                "" if row["party_type"] == "None" else row["party_type"],
                "" if row["party"] == "None" else row["party"],
                row["against"],
            )
            for row in ORACLE["gl"]
        )
        self.assertEqual(actual, expected)
        self.assertEqual(sum(row[1] for row in actual), sum(row[2] for row in actual))

    def test_status_and_outstanding_after_submit(self):
        invoice = self.make_invoice()
        invoice.submit()
        reloaded = get_doc("Sales Invoice", invoice.name)
        self.assertEqual(reloaded.docstatus, 1)
        self.assertEqual(reloaded.status, ORACLE["invoices"][0]["status"])
        self.assertEqual(money(reloaded.outstanding_amount), money(ORACLE["invoices"][0]["outstanding_amount"]))

    def test_cancel_reverses_the_ledger(self):
        invoice = self.make_invoice()
        invoice.submit()
        invoice.cancel()
        entries = get_model("GL Entry").objects.filter(voucher_no=invoice.name)
        total_debit = sum(money(entry.debit) for entry in entries)
        total_credit = sum(money(entry.credit) for entry in entries)
        self.assertEqual(total_debit, total_credit)
        net_by_account = {}
        for entry in entries:
            net_by_account[entry.account] = net_by_account.get(entry.account, Decimal(0)) + money(entry.debit) - money(entry.credit)
        self.assertTrue(all(value == 0 for value in net_by_account.values()))


    def test_tax_inclusive_rate_splits_net_and_vat(self):
        invoice = self.make_invoice(rate=116000, included=1)
        self.assertEqual(money(invoice.net_total), money(100000))
        self.assertEqual(money(invoice.total_taxes_and_charges), money(16000))
        self.assertEqual(money(invoice.grand_total), money(116000))

    def test_additional_discount_on_net_total(self):
        invoice = self.make_invoice(discount_percent=10)
        self.assertEqual(money(invoice.discount_amount), money(10000))
        self.assertEqual(money(invoice.net_total), money(90000))
        self.assertEqual(money(invoice.total_taxes_and_charges), money(14400))
        self.assertEqual(money(invoice.grand_total), money(104400))
        invoice.submit()
        entries = get_model("GL Entry").objects.filter(voucher_no=invoice.name, is_cancelled=0)
        self.assertEqual(sum(money(e.debit) for e in entries), money(104400))
        self.assertEqual(sum(money(e.credit) for e in entries), money(104400))

    def test_multiple_quantity_line_amount(self):
        invoice = self.make_invoice(rate=2500, qty=4)
        self.assertEqual(money(invoice.total), money(10000))
        self.assertEqual(money(invoice.grand_total), money(11600))

    def test_payment_entry_settles_the_invoice(self):
        from apps.erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        invoice = self.make_invoice()
        invoice.submit()
        payment = get_payment_entry("Sales Invoice", invoice.name, bank_account="Cash - BML")
        payment.reference_no = "CHQ-1"
        payment.reference_date = "2026-10-03"
        payment.insert()
        payment.submit()
        reloaded = get_doc("Sales Invoice", invoice.name)
        self.assertEqual(money(reloaded.outstanding_amount), money(0))
        self.assertEqual(reloaded.status, "Paid")

    def test_partial_payment_leaves_balance(self):
        from apps.erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        invoice = self.make_invoice()
        invoice.submit()
        payment = get_payment_entry("Sales Invoice", invoice.name, bank_account="Cash - BML")
        payment.paid_amount = 16000
        payment.received_amount = 16000
        payment.references[0].allocated_amount = 16000
        payment.reference_no = "CHQ-2"
        payment.reference_date = "2026-10-03"
        payment.insert()
        payment.submit()
        reloaded = get_doc("Sales Invoice", invoice.name)
        self.assertEqual(money(reloaded.outstanding_amount), money(100000))
        self.assertEqual(reloaded.status, "Partly Paid")

    def test_credit_note_reverses_the_sale(self):
        from apps.erpnext.accounts.doctype.sales_invoice.mapper import make_sales_return

        invoice = self.make_invoice()
        invoice.submit()
        credit_note = make_sales_return(invoice.name)
        credit_note.insert()
        credit_note.submit()
        self.assertEqual(money(credit_note.grand_total), money(-116000))
        self.assertEqual(money(get_doc("Sales Invoice", credit_note.name).outstanding_amount), money(-116000))
        reloaded = get_doc("Sales Invoice", invoice.name)
        self.assertEqual(money(reloaded.outstanding_amount), money(116000))


    def assert_totals(self, document, expected):
        for fieldname in TOTAL_FIELDS:
            self.assertEqual(money(document.get(fieldname) or 0), money(expected[fieldname] or 0), fieldname)
        self.assertEqual(money(document.get("discount_amount") or 0), money(expected["discount_amount"] or 0))

    def ledger(self, voucher_no):
        return sorted(
            (row.account, money(row.debit), money(row.credit))
            for row in get_model("GL Entry").objects.filter(voucher_no=voucher_no, is_cancelled=0)
        )

    def expected_ledger(self, rows):
        return sorted((row["account"], money(row["debit"]), money(row["credit"])) for row in rows)

    def test_oracle_inclusive_tax(self):
        self.assert_totals(self.make_invoice(rate=116000, included=1), SCENARIOS["inclusive"]["totals"])

    def test_oracle_discount(self):
        invoice = self.make_invoice(discount_percent=10)
        self.assert_totals(invoice, SCENARIOS["discount"]["totals"])
        invoice.submit()
        self.assertEqual(self.ledger(invoice.name), self.expected_ledger(SCENARIOS["discount"]["gl"]))

    def test_oracle_quantity(self):
        self.assert_totals(self.make_invoice(rate=2500, qty=4), SCENARIOS["quantity"]["totals"])

    def pay(self, invoice, amount=None):
        from apps.erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry

        payment = get_payment_entry("Sales Invoice", invoice.name, bank_account="Cash - BML")
        if amount:
            payment.paid_amount = amount
            payment.received_amount = amount
            payment.references[0].allocated_amount = amount
        payment.reference_no = "CHQ-ORACLE"
        payment.reference_date = "2026-10-03"
        payment.insert()
        payment.submit()
        return payment

    def test_oracle_full_payment(self):
        invoice = self.make_invoice()
        invoice.submit()
        payment = self.pay(invoice)
        reloaded = get_doc("Sales Invoice", invoice.name)
        expected = SCENARIOS["full_payment"]
        self.assertEqual(reloaded.status, expected["si"]["status"])
        self.assertEqual(money(reloaded.outstanding_amount), money(expected["si"]["outstanding_amount"]))
        self.assertEqual(self.ledger(payment.name), self.expected_ledger(expected["gl"]))

    def test_oracle_partial_payment(self):
        invoice = self.make_invoice()
        invoice.submit()
        payment = self.pay(invoice, 16000)
        reloaded = get_doc("Sales Invoice", invoice.name)
        expected = SCENARIOS["partial_payment"]
        self.assertEqual(reloaded.status, expected["si"]["status"])
        self.assertEqual(money(reloaded.outstanding_amount), money(expected["si"]["outstanding_amount"]))
        self.assertEqual(self.ledger(payment.name), self.expected_ledger(expected["gl"]))

    def test_oracle_credit_note(self):
        from apps.erpnext.accounts.doctype.sales_invoice.mapper import make_sales_return

        invoice = self.make_invoice()
        invoice.submit()
        credit_note = make_sales_return(invoice.name)
        credit_note.insert()
        credit_note.submit()
        expected = SCENARIOS["credit_note"]
        reloaded_credit_note = get_doc("Sales Invoice", credit_note.name)
        self.assert_totals(reloaded_credit_note, expected["credit_note"])
        self.assertEqual(reloaded_credit_note.status, expected["credit_note"]["status"])
        self.assertEqual(get_doc("Sales Invoice", invoice.name).status, expected["original"]["status"])
        self.assertEqual(self.ledger(credit_note.name), self.expected_ledger(expected["gl"]))
