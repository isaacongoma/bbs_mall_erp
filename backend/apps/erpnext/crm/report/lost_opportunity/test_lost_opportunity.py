import frappe
from frappe.utils import add_days, today

from erpnext.crm.report.lost_opportunity.lost_opportunity import execute
from erpnext.tests.utils import ERPNextTestSuite


class TestLostOpportunity(ERPNextTestSuite):
    def test_report_aggregates_lost_reasons(self):
        company = frappe.db.get_value("Company", {}, "name")
        columns, data = execute(
            frappe._dict({"company": company, "from_date": add_days(today(), -365), "to_date": today()})
        )
        self.assertTrue(columns)
        self.assertIsInstance(data, list)
