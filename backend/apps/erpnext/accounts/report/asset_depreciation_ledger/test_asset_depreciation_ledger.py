import frappe

from erpnext.accounts.report.asset_depreciation_ledger.asset_depreciation_ledger import execute
from erpnext.tests.utils import ERPNextTestSuite


class TestAssetDepreciationLedger(ERPNextTestSuite):
    def test_report_executes(self):
        company = frappe.db.get_value("Company", {}, "name")
        columns, *_rest = execute(
            frappe._dict({"company": company, "from_date": "2020-01-01", "to_date": "2030-12-31"})
        )
        self.assertTrue(columns)
