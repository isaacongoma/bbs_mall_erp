import frappe
from frappe.utils import add_days, today

from erpnext.support.report.issue_summary.issue_summary import execute
from erpnext.tests.utils import ERPNextTestSuite


class TestIssueSummary(ERPNextTestSuite):
    def test_count_grouped_by_issue_priority(self):
        priority = "__Test Issue Summary Priority"
        if not frappe.db.exists("Issue Priority", priority):
            frappe.get_doc({"doctype": "Issue Priority", "name": priority}).insert()

        opening_date = today()
        for subject in ("__Test Issue Summary A", "__Test Issue Summary B"):
            frappe.get_doc(
                {
                    "doctype": "Issue",
                    "subject": subject,
                    "priority": priority,
                    "status": "Open",
                    "opening_date": opening_date,
                }
            ).insert()

        filters = frappe._dict(
            {
                "based_on": "Issue Priority",
                "from_date": add_days(opening_date, -1),
                "to_date": add_days(opening_date, 1),
            }
        )

        columns, data, _msg, _chart, _summary = execute(filters)

        seeded_row = next((row for row in data if row.get("priority") == priority), None)
        self.assertIsNotNone(
            seeded_row,
            f"expected a summary row for priority {priority!r}, got {[r.get('priority') for r in data]}",
        )

        self.assertEqual(seeded_row["total_issues"], 2)
        self.assertEqual(seeded_row["open"], 2)
