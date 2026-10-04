from decimal import Decimal

from django.test import TestCase

import frappe
from apps.erpnext.registry import get_model
from apps.frappe.runtime import get_doc, new_doc, session


def money(value):
    return Decimal(str(value)).quantize(Decimal("0.01"))


class JournalEntryParity(TestCase):
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
        fiscal_year = new_doc("Fiscal Year")
        fiscal_year.year = "2026"
        fiscal_year.year_start_date = "2026-01-01"
        fiscal_year.year_end_date = "2026-12-31"
        fiscal_year.insert(ignore_if_duplicate=True)

    def make_entry(self, debit_account="Cash - BML", credit_account="Sales - BML", amount=5000):
        entry = new_doc("Journal Entry")
        entry.voucher_type = "Journal Entry"
        entry.company = self.company
        entry.posting_date = "2026-10-03"
        entry.append("accounts", {"account": debit_account, "debit_in_account_currency": amount})
        entry.append("accounts", {"account": credit_account, "credit_in_account_currency": amount, "cost_center": "Main - BML"})
        entry.insert()
        return entry

    def gl(self, entry):
        return sorted(
            (row.account, money(row.debit), money(row.credit))
            for row in get_model("GL Entry").objects.filter(voucher_no=entry.name, is_cancelled=0)
        )

    def test_totals_and_difference(self):
        entry = self.make_entry()
        self.assertEqual(money(entry.total_debit), money(5000))
        self.assertEqual(money(entry.total_credit), money(5000))
        self.assertEqual(money(entry.difference), money(0))

    def test_submit_posts_balanced_gl(self):
        entry = self.make_entry()
        entry.submit()
        self.assertEqual(
            self.gl(entry),
            [("Cash - BML", money(5000), money(0)), ("Sales - BML", money(0), money(5000))],
        )

    def test_unbalanced_entry_is_rejected(self):
        entry = new_doc("Journal Entry")
        entry.voucher_type = "Journal Entry"
        entry.company = self.company
        entry.posting_date = "2026-10-03"
        entry.append("accounts", {"account": "Cash - BML", "debit_in_account_currency": 5000})
        entry.append("accounts", {"account": "Sales - BML", "credit_in_account_currency": 4000})
        entry.accounts[1].cost_center = "Main - BML"
        entry.insert()
        self.assertEqual(money(entry.difference), money(1000))
        with self.assertRaises(frappe.ValidationError):
            entry.submit()

    def test_cancel_reverses_gl(self):
        entry = self.make_entry()
        entry.submit()
        entry.cancel()
        net = {}
        for row in get_model("GL Entry").objects.filter(voucher_no=entry.name):
            net[row.account] = net.get(row.account, Decimal(0)) + money(row.debit) - money(row.credit)
        self.assertTrue(all(value == 0 for value in net.values()))
        self.assertEqual(get_doc("Journal Entry", entry.name).docstatus, 2)

    def test_group_account_is_rejected(self):
        with self.assertRaises(frappe.ValidationError):
            self.make_entry(debit_account="Application of Funds (Assets) - BML")

    def test_naming_series_name(self):
        entry = self.make_entry()
        self.assertTrue(entry.name.startswith("ACC-JV-2026-"))
