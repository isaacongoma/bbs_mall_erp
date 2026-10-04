from datetime import timedelta

import frappe
from frappe.utils import get_datetime, today

from erpnext.projects.doctype.timesheet.test_timesheet import make_timesheet
from erpnext.projects.report.daily_timesheet_summary.daily_timesheet_summary import execute
from erpnext.setup.doctype.employee.test_employee import make_employee
from erpnext.tests.utils import ERPNextTestSuite


class TestDailyTimesheetSummary(ERPNextTestSuite):
    def test_submitted_timesheet_in_summary(self):
        frappe.set_user("Administrator")

        employee = make_employee("test_employee_6@salary.com", company="_Test Company")
        timesheet = make_timesheet(employee, simulate=True)

        start = get_datetime(today()) + timedelta(hours=9)
        frappe.db.set_value(
            "Timesheet Detail",
            timesheet.time_logs[0].name,
            {"from_time": start, "to_time": start + timedelta(hours=2)},
            update_modified=False,
        )

        _columns, data = execute({"from_date": today(), "to_date": today()})

        names = [row[0] for row in data]
        self.assertIn(timesheet.name, names)
