import json
from pathlib import Path

from django.test import TestCase

import frappe
from apps.erpnext.registry import get_model
from apps.erpnext.setup.doctype.company.company import Company
from apps.frappe.runtime import get_doc, new_doc, session

ORACLE_FILE = Path(__file__).resolve().parents[3] / "tests" / "oracle" / "standard_chart_company.json"


def make_kenya_company(name="Chart Test Co", abbr="BML"):
    company = new_doc("Company")
    company.company_name = name
    company.abbr = abbr
    company.default_currency = "KES"
    company.country = "Kenya"
    company.chart_of_accounts = "Standard"
    company.insert()
    return company


class TestCompany(TestCase):
    def setUp(self):
        session.user = "Administrator"

    def test_controller_class_is_resolved(self):
        company = make_kenya_company()
        self.assertIsInstance(get_doc("Company", company.name), Company)

    def test_standard_chart_matches_the_oracle_account_tree(self):
        company = make_kenya_company()
        oracle = json.loads(ORACLE_FILE.read_text(encoding="utf-8"))
        accounts = list(
            get_model("Account").objects.filter(company=company.name).order_by("lft").values(
                "account_name",
                "account_number",
                "parent_account",
                "root_type",
                "report_type",
                "account_type",
                "is_group",
                "account_currency",
            )
        )
        hrms_accounts = {"Expense Claims", "Input VAT", "Output VAT", "Withholding Tax Payable"}
        self.assertEqual(hrms_accounts - {row["account_name"] for row in accounts}, set())
        ours = {row["account_name"]: row for row in accounts if row["account_name"] not in hrms_accounts}
        expected = {row["account_name"]: row for row in oracle if row["account_name"] != "Equity Bank"}
        self.assertEqual(sorted(ours), sorted(expected))
        for account_name, row in expected.items():
            actual = ours[account_name]
            for field in ("account_number", "root_type", "report_type", "account_type", "is_group", "account_currency"):
                self.assertEqual(actual[field] or "", row[field] or "", f"{account_name}.{field}")
            self.assertEqual(actual["parent_account"] or None, row["parent_account"] or None, f"{account_name}.parent_account")

    def test_company_defaults_are_populated(self):
        company = make_kenya_company("Defaults Co", "DFC")
        reloaded = get_doc("Company", company.name)
        self.assertEqual(reloaded.default_receivable_account, "Debtors - DFC")
        self.assertEqual(reloaded.default_payable_account, "Creditors - DFC")
        self.assertEqual(reloaded.default_currency, "KES")
        self.assertEqual(frappe.db.get_value("Currency", "KES", "enabled"), 1)
        self.assertTrue(frappe.db.exists("Cost Center", {"company": company.name, "is_group": 0}))
        self.assertTrue(frappe.db.exists("Warehouse", {"company": company.name}))
        self.assertTrue(frappe.db.exists("Department", {"company": company.name}))

    def test_account_numbers_and_abbreviation_suffixes(self):
        company = make_kenya_company("Suffix Co", "SFX")
        names = set(get_model("Account").objects.filter(company=company.name).values_list("name", flat=True))
        self.assertIn("Debtors - SFX", names)
        self.assertTrue(all(name.endswith(" - SFX") for name in names))
