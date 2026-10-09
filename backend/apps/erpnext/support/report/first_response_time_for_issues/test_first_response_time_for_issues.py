import frappe
from frappe.utils import add_days, getdate, now_datetime

from erpnext.support.report.first_response_time_for_issues.first_response_time_for_issues import (
    execute,
)
from erpnext.tests.utils import ERPNextTestSuite


class TestFirstResponseTimeForIssues(ERPNextTestSuite):
    def test_avg_first_response_time_grouped_by_creation_date(self):
        today = getdate()

        frappe.db.delete("Issue", {"creation": (">=", today)})

        issue = frappe.get_doc(
            {
                "doctype": "Issue",
                "subject": "First Response Time Report Issue",
                "raised_by": "test_frt_report@example.com",
                "description": "First Response Time Report Issue",
                "company": "_Test Company",
                "creation": now_datetime(),
            }
        ).insert(ignore_permissions=True)

        response_time = 3600
        frappe.db.set_value("Issue", issue.name, "first_response_time", response_time)

        columns, data = execute(frappe._dict(from_date=add_days(today, -1), to_date=add_days(today, 1)))

        rows_for_today = [row for row in data if getdate(row[0]) == today]
        self.assertEqual(
            len(rows_for_today),
            1,
            f"expected exactly one grouped row for {today}, got {rows_for_today}",
        )

        creation_date, avg_response_time = rows_for_today[0]
        self.assertEqual(getdate(creation_date), today)
        self.assertEqual(float(avg_response_time), float(response_time))
