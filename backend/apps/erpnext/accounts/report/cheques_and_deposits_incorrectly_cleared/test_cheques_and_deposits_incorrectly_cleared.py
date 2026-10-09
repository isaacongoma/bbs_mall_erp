import frappe
from frappe.utils import nowdate

from erpnext.accounts.report.cheques_and_deposits_incorrectly_cleared.cheques_and_deposits_incorrectly_cleared import (
    execute,
)
from erpnext.tests.utils import ERPNextTestSuite


class TestChequesAndDepositsIncorrectlyCleared(ERPNextTestSuite):
    def test_report_executes_with_case_amount(self):
        company = frappe.db.get_value("Company", {}, "name")
        account = frappe.db.get_value(
            "Account", {"account_type": "Bank", "company": company, "is_group": 0}, "name"
        )
        columns, data = execute(frappe._dict({"account": account, "report_date": nowdate()}))
        self.assertTrue(columns)
        self.assertIsInstance(data, list)
