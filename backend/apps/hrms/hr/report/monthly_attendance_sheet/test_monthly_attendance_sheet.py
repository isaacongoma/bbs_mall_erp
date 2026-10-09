from dateutil.relativedelta import relativedelta

import frappe
from frappe.utils import add_days, get_year_ending, get_year_start, getdate

from erpnext.setup.doctype.employee.employee import is_holiday
from erpnext.setup.doctype.employee.test_employee import make_employee

from hrms.hr.doctype.attendance.attendance import mark_attendance
from hrms.hr.doctype.holiday_list_assignment.test_holiday_list_assignment import (
    assign_holiday_list,
    create_holiday_list_assignment,
)
from hrms.hr.doctype.leave_allocation.leave_allocation import OverlapError
from hrms.hr.doctype.leave_application.test_leave_application import make_allocation_record
from hrms.hr.doctype.shift_type.test_shift_type import setup_shift_type
from hrms.hr.report.monthly_attendance_sheet.monthly_attendance_sheet import execute
from hrms.payroll.doctype.salary_slip.test_salary_slip import (
    make_holiday_list,
    make_leave_application,
)
from hrms.tests.test_utils import create_company, create_department, get_first_day_for_prev_month
from hrms.tests.utils import HRMSTestSuite


class TestMonthlyAttendanceSheet(HRMSTestSuite):
    def setUp(self):
        self.company = "_Test Company"
        self.employee = make_employee("test_employee@example.com", company=self.company)
        self.filter_based_on = "Month"
        for dt in ("Attendance", "Leave Application"):
            frappe.db.delete(dt)

        if not frappe.db.exists("Shift Type", "Day Shift"):
            setup_shift_type(shift_type="Day Shift")

        date = getdate()
        from_date = get_year_start(date)
        to_date = get_year_ending(date)
        make_holiday_list(from_date=from_date, to_date=to_date)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_monthly_attendance_sheet_report(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")

        employee_on_leave_with_shift = make_employee("employee@leave.com", company=self.company)
        mark_attendance(employee_on_leave_with_shift, previous_month_first, "On Leave", "Day Shift")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        datasets = report[3]["data"]["datasets"]

        absent = datasets[0]["values"]
        present = datasets[1]["values"]
        leaves = datasets[2]["values"]

        self.assertEqual(self.employee, report[1][0].get("employee"))
        self.assertEqual("Day Shift", report[1][1].get("shift"))
        self.assertEqual(absent[0], 1)
        self.assertEqual(present[1], 1)
        self.assertEqual(leaves[2], 1)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_detailed_view(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present", "Day Shift")

        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=3), "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        day_shift_row = report[1][0]
        row_without_shift = report[1][1]

        self.assertEqual(day_shift_row["shift"], "Day Shift")
        self.assertEqual(
            day_shift_row[date_key(previous_month_first)], "A"
        )
        self.assertEqual(
            day_shift_row[date_key(add_days(previous_month_first, 1))], "P"
        )

        self.assertEqual(row_without_shift["shift"], "")
        self.assertEqual(
            row_without_shift[date_key(add_days(previous_month_first, 3))], "P"
        )

        self.assertTrue(
            day_shift_row[date_key(add_days(previous_month_first, 2))]
            == row_without_shift[date_key(add_days(previous_month_first, 2))]
            == "L"
        )

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_single_shift_with_leaves_in_detailed_view(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present", "Day Shift")

        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)
        self.assertEqual(len(report[1]), 1)

        day_shift_row = report[1][0]

        self.assertEqual(day_shift_row["shift"], "Day Shift")
        self.assertEqual(
            day_shift_row[date_key(previous_month_first)], "A"
        )
        self.assertEqual(
            day_shift_row[date_key(add_days(previous_month_first, 1))], "P"
        )
        self.assertEqual(
            day_shift_row[date_key(add_days(previous_month_first, 2))], "L"
        )

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_single_leave_record(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "On Leave")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        self.assertEqual(len(report[1]), 1)
        row = report[1][0]

        self.assertIsNone(row["shift"])
        self.assertEqual(row[date_key(previous_month_first)], "L")

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_summarized_view(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "Half Day")

        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=3), "Present"
        )
        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=4), "Present", late_entry=1
        )
        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=5), "Present", early_exit=1
        )

        leave_application = get_leave_application(self.employee)

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "summarized_view": 1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        row = report[1][0]
        self.assertEqual(row["employee"], self.employee)

        self.assertEqual(row["total_present"], 4.5)
        self.assertEqual(row["total_absent"], 1.5)
        self.assertEqual(row["total_leaves"], leave_application.total_leave_days)

        self.assertEqual(row["_test_leave_type"], leave_application.total_leave_days)
        self.assertEqual(row["total_late_entries"], 1)
        self.assertEqual(row["total_early_exits"], 1)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_summarized_view_with_leave_backed_half_day(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present")

        year_start = getdate(get_year_start(previous_month_first))
        year_end = getdate(get_year_ending(previous_month_first))
        try:
            make_allocation_record(employee=self.employee, from_date=year_start, to_date=year_end)
        except OverlapError:
            pass

        leave_backed_day = add_days(previous_month_first, 2)
        while is_holiday(self.employee, leave_backed_day):
            leave_backed_day = add_days(leave_backed_day, 1)
        make_leave_application(
            self.employee,
            leave_backed_day,
            leave_backed_day,
            "_Test Leave Type",
            half_day=True,
            half_day_date=leave_backed_day,
        )

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "summarized_view": 1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        row = report[1][0]
        self.assertEqual(row["employee"], self.employee)

        self.assertEqual(row["total_present"], 1.5)
        self.assertEqual(row["total_absent"], 1)
        self.assertEqual(row["total_leaves"], 0.5)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_attendance_with_group_by_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present", "Day Shift")

        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=3), "Present")

        departmentless_employee = make_employee(
            "emp@departmentless.com", company=self.company, department=None
        )
        mark_attendance(departmentless_employee, previous_month_first + relativedelta(days=3), "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "group_by": "Department",
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        department = frappe.db.get_value("Employee", self.employee, "department")
        department_row = report[1][0]
        self.assertIn(department, department_row["department"])

        day_shift_row = report[1][1]
        row_without_shift = report[1][2]

        self.assertEqual(day_shift_row["shift"], "Day Shift")
        self.assertEqual(
            day_shift_row[date_key(previous_month_first)], "A"
        )
        self.assertEqual(
            day_shift_row[date_key(add_days(previous_month_first, 1))], "P"
        )

        self.assertEqual(row_without_shift["shift"], "")
        self.assertEqual(
            row_without_shift[date_key(add_days(previous_month_first, 2))], "L"
        )
        self.assertEqual(
            row_without_shift[date_key(add_days(previous_month_first, 3))], "P"
        )

    def test_attendance_with_employee_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        employee2 = make_employee("test_employee2@example.com", company=self.company)
        employee3 = make_employee("test_employee3@example.com", company=self.company)

        mark_attendance(self.employee, previous_month_first, "Absent")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")

        mark_attendance(employee2, previous_month_first, "Absent")
        mark_attendance(employee2, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(employee2, previous_month_first + relativedelta(days=2), "On Leave")

        mark_attendance(employee3, previous_month_first, "Absent")
        mark_attendance(employee3, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(employee3, previous_month_first + relativedelta(days=2), "On Leave")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "employee": self.employee,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        record = report[1][0]
        datasets = report[3]["data"]["datasets"]
        absent = datasets[0]["values"]
        present = datasets[1]["values"]
        leaves = datasets[2]["values"]

        self.assertEqual(len(report[1]), 1)

        self.assertEqual(self.employee, record.get("employee"))
        self.assertEqual(absent[0], 1)
        self.assertEqual(present[1], 1)
        self.assertEqual(leaves[2], 1)

    def test_attendance_with_company_filter(self):
        create_company("Test Parent Company", is_group=1, abbr="TPC-HR")
        create_company("Test Child Company", is_group=1, parent_company="Test Parent Company", abbr="TCC-HR")
        create_company("Test Grandchild Company", parent_company="Test Child Company", abbr="TGC-HR")

        employee1 = make_employee("test_employee@parent.com", company="Test Parent Company")
        employee2 = make_employee("test_employee@child.com", company="Test Child Company")
        employee3 = make_employee("test_employee@grandchild.com", company="Test Grandchild Company")

        previous_month_first = get_first_day_for_prev_month()
        mark_attendance(employee1, previous_month_first, "Present")
        mark_attendance(employee2, previous_month_first, "Present")
        mark_attendance(employee3, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": "Test Parent Company",
                "include_company_descendants": 1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)
        self.assertEqual(len(report[1]), 3)

        filters.include_company_descendants = 0
        report = execute(filters=filters)
        self.assertEqual(len(report[1]), 1)

    def test_attendance_with_employee_filter_and_summarized_view(self):
        previous_month_first = get_first_day_for_prev_month()

        employee2 = make_employee("test_employee2@example.com", company=self.company)
        employee3 = make_employee("test_employee3@example.com", company=self.company)

        mark_attendance(self.employee, previous_month_first, "Absent")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "On Leave")

        mark_attendance(employee2, previous_month_first, "Absent")
        mark_attendance(employee2, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(employee2, previous_month_first + relativedelta(days=2), "On Leave")

        mark_attendance(employee3, previous_month_first, "Absent")
        mark_attendance(employee3, previous_month_first + relativedelta(days=1), "Present")
        mark_attendance(employee3, previous_month_first + relativedelta(days=2), "On Leave")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "employee": self.employee,
                "summarized_view": 1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        record = report[1][0]
        datasets = report[3]["data"]["datasets"]
        absent = datasets[0]["values"]
        present = datasets[1]["values"]
        leaves = datasets[2]["values"]

        self.assertEqual(len(report[1]), 1)

        self.assertEqual(self.employee, record.get("employee"))
        self.assertEqual(absent[0], 1)
        self.assertEqual(present[1], 1)
        self.assertEqual(leaves[2], 1)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_validations(self):
        self.assertRaises(
            frappe.ValidationError, execute_report_with_invalid_filters, invalid_filter_name="filter_based_on"
        )

        self.assertRaises(
            frappe.ValidationError, execute_report_with_invalid_filters, invalid_filter_name="month"
        )

        self.assertRaises(
            frappe.ValidationError, execute_report_with_invalid_filters, invalid_filter_name="start_date"
        )

        filters = frappe._dict(
            {
                "start_date": getdate(),
                "end_date": add_days(getdate(), 100),
                "company": self.company,
                "group_by": "Department",
                "filter_based_on": "Date Range",
            }
        )
        self.assertRaises(frappe.ValidationError, execute, filters=filters)
        previous_month_first = get_first_day_for_prev_month()

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "group_by": "Department",
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)
        self.assertEqual(report, ([], [], None, None))

    def test_summarised_view_with_date_range_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        mark_attendance(self.employee, previous_month_first, "Absent", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=1), "Present", "Day Shift")
        mark_attendance(self.employee, previous_month_first + relativedelta(days=2), "Half Day")

        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=3), "Present"
        )
        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=4), "Present", late_entry=1
        )
        mark_attendance(
            self.employee, previous_month_first + relativedelta(days=5), "Present", early_exit=1
        )

        leave_application = get_leave_application(self.employee, previous_month_first)

        filters = frappe._dict(
            {
                "start_date": add_days(previous_month_first, -1),
                "end_date": add_days(previous_month_first, 30),
                "company": self.company,
                "summarized_view": 1,
                "filter_based_on": "Date Range",
            }
        )
        report = execute(filters=filters)

        row = report[1][0]
        self.assertEqual(row["employee"], self.employee)

        self.assertEqual(row["total_present"], 4.5)
        self.assertEqual(row["total_absent"], 1.5)
        self.assertEqual(row["total_leaves"], leave_application.total_leave_days)

        self.assertEqual(row["_test_leave_type"], leave_application.total_leave_days)
        self.assertEqual(row["total_late_entries"], 1)
        self.assertEqual(row["total_early_exits"], 1)

    def test_summarised_view_with_date_range_across_month_boundary(self):
        previous_month_first = get_first_day_for_prev_month()
        year_start = getdate(get_year_start(previous_month_first))

        start_date = previous_month_first.replace(day=5)
        end_date = start_date + relativedelta(months=1)
        year_end = getdate(get_year_ending(end_date))

        hl = make_holiday_list(
            "Test Cross Month HL", from_date=year_start, to_date=year_end, add_weekly_offs=False
        )
        add_holiday_to_list(hl, end_date)

        frappe.db.delete("Holiday List Assignment", {"assigned_to": self.employee})
        create_holiday_list_assignment("Employee", self.employee, hl, from_date=year_start)

        mark_attendance(self.employee, start_date, "Present")

        filters = frappe._dict(
            {
                "filter_based_on": "Date Range",
                "start_date": start_date,
                "end_date": end_date,
                "company": self.company,
                "summarized_view": 1,
            }
        )
        report = execute(filters=filters)
        row = report[1][0]

        self.assertEqual(row["total_holidays"], 1)

    def test_detailed_view_with_date_range_filter(self):
        today = getdate()
        mark_attendance(self.employee, today, "Absent", "Day Shift")
        mark_attendance(self.employee, today + relativedelta(days=1), "Present", "Day Shift")

        mark_attendance(self.employee, today + relativedelta(days=2), "On Leave")
        mark_attendance(self.employee, today + relativedelta(days=3), "Present")
        filters = frappe._dict(
            {
                "filter_based_on": "Date Range",
                "start_date": add_days(today, -1),
                "end_date": add_days(today, 30),
                "company": self.company,
            }
        )
        report = execute(filters=filters)
        day_shift_row = report[1][0]
        row_without_shift = report[1][1]

        self.assertEqual(day_shift_row["shift"], "Day Shift")
        self.assertEqual(day_shift_row[date_key(today)], "A")
        self.assertEqual(day_shift_row[date_key(add_days(today, 1))], "P")

        self.assertEqual(row_without_shift["shift"], "")
        self.assertEqual(row_without_shift[date_key(add_days(today, 3))], "P")

        self.assertTrue(
            day_shift_row[date_key(add_days(today, 2))]
            == row_without_shift[date_key(add_days(today, 2))]
            == "L"
        )

    def test_attendance_with_department_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        dept1 = create_department("Test Dept Alpha")
        dept2 = create_department("Test Dept Beta")

        emp_dept1 = make_employee("emp_dept1@example.com", company=self.company, department=dept1)
        emp_dept2 = make_employee("emp_dept2@example.com", company=self.company, department=dept2)

        mark_attendance(emp_dept1, previous_month_first, "Present")
        mark_attendance(emp_dept2, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "department": dept1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(emp_dept1, employees_in_report)
        self.assertNotIn(emp_dept2, employees_in_report)

    def test_attendance_with_status_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        active_employee = make_employee("emp_active@example.com", company=self.company)
        left_employee = make_employee("emp_left@example.com", company=self.company)
        frappe.db.set_value("Employee", left_employee, "status", "Left")

        mark_attendance(active_employee, previous_month_first, "Present")
        mark_attendance(left_employee, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "status": "Active",
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)
        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(active_employee, employees_in_report)
        self.assertNotIn(left_employee, employees_in_report)

        filters.status = "Left"
        report = execute(filters=filters)
        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(left_employee, employees_in_report)
        self.assertNotIn(active_employee, employees_in_report)

        filters.status = ""
        report = execute(filters=filters)
        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(active_employee, employees_in_report)
        self.assertIn(left_employee, employees_in_report)

    def test_attendance_with_branch_filter(self):
        previous_month_first = get_first_day_for_prev_month()

        branch1 = create_branch("Test Branch Alpha")
        branch2 = create_branch("Test Branch Beta")

        emp_branch1 = make_employee("emp_branch1@example.com", company=self.company, branch=branch1)
        emp_branch2 = make_employee("emp_branch2@example.com", company=self.company, branch=branch2)

        mark_attendance(emp_branch1, previous_month_first, "Present")
        mark_attendance(emp_branch2, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "branch": branch1,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(emp_branch1, employees_in_report)
        self.assertNotIn(emp_branch2, employees_in_report)

    def test_attendance_with_department_and_branch_filter_combined(self):
        previous_month_first = get_first_day_for_prev_month()

        dept = create_department("Test Dept Combined")
        branch = create_branch("Test Branch Combined")

        emp_match = make_employee(
            "emp_match@example.com", company=self.company, department=dept, branch=branch
        )
        emp_wrong_branch = make_employee(
            "emp_wrong_branch@example.com",
            company=self.company,
            department=dept,
            branch=create_branch("Test Branch Other"),
        )
        emp_wrong_dept = make_employee(
            "emp_wrong_dept@example.com",
            company=self.company,
            department=create_department("Test Dept Other"),
            branch=branch,
        )

        mark_attendance(emp_match, previous_month_first, "Present")
        mark_attendance(emp_wrong_branch, previous_month_first, "Present")
        mark_attendance(emp_wrong_dept, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "department": dept,
                "branch": branch,
                "filter_based_on": self.filter_based_on,
            }
        )
        report = execute(filters=filters)

        employees_in_report = [row.get("employee") for row in report[1] if row.get("employee")]

        self.assertIn(emp_match, employees_in_report)
        self.assertNotIn(emp_wrong_branch, employees_in_report)
        self.assertNotIn(emp_wrong_dept, employees_in_report)

    def test_multiple_holiday_list_assignments_in_detailed_view(self):
        previous_month_first = get_first_day_for_prev_month()
        year_start = getdate(get_year_start(previous_month_first))
        year_end = getdate(get_year_ending(previous_month_first))

        hl1_day = previous_month_first.replace(day=5)
        hl1_bleed = previous_month_first.replace(day=20)
        hl2_bleed = previous_month_first.replace(day=10)
        hl2_day = previous_month_first.replace(day=25)
        hl2_start = previous_month_first.replace(day=16)

        hl1 = make_holiday_list(
            "Test Multi HL-1", from_date=year_start, to_date=year_end, add_weekly_offs=False
        )
        hl2 = make_holiday_list(
            "Test Multi HL-2", from_date=year_start, to_date=year_end, add_weekly_offs=False
        )

        add_holiday_to_list(hl1, hl1_day)
        add_holiday_to_list(hl1, hl1_bleed)
        add_holiday_to_list(hl2, hl2_bleed)
        add_holiday_to_list(hl2, hl2_day)

        frappe.db.delete("Holiday List Assignment", {"assigned_to": self.employee})
        create_holiday_list_assignment("Employee", self.employee, hl1, from_date=previous_month_first)
        create_holiday_list_assignment("Employee", self.employee, hl2, from_date=hl2_start)

        mark_attendance(self.employee, previous_month_first, "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": "Month",
            }
        )
        report = execute(filters=filters)
        row = report[1][0]

        self.assertEqual(row[date_key(hl1_day)], "H")
        self.assertEqual(row[date_key(hl2_day)], "H")
        self.assertNotEqual(row[date_key(hl1_bleed)], "H")
        self.assertNotEqual(row[date_key(hl2_bleed)], "H")

    def test_multiple_holiday_list_assignments_in_summarized_view(self):
        previous_month_first = get_first_day_for_prev_month()
        year_start = getdate(get_year_start(previous_month_first))
        year_end = getdate(get_year_ending(previous_month_first))

        hl1_day = previous_month_first.replace(day=5)
        hl2_day = previous_month_first.replace(day=25)
        hl2_start = previous_month_first.replace(day=16)

        hl1 = make_holiday_list(
            "Test Multi HL-1", from_date=year_start, to_date=year_end, add_weekly_offs=False
        )
        hl2 = make_holiday_list(
            "Test Multi HL-2", from_date=year_start, to_date=year_end, add_weekly_offs=False
        )

        add_holiday_to_list(hl1, hl1_day)
        add_holiday_to_list(hl2, hl2_day)

        frappe.db.delete("Holiday List Assignment", {"assigned_to": self.employee})
        create_holiday_list_assignment("Employee", self.employee, hl1, from_date=previous_month_first)
        create_holiday_list_assignment("Employee", self.employee, hl2, from_date=hl2_start)

        mark_attendance(self.employee, previous_month_first.replace(day=3), "Present")

        filters = frappe._dict(
            {
                "month": previous_month_first.month,
                "year": previous_month_first.year,
                "company": self.company,
                "filter_based_on": "Month",
                "summarized_view": 1,
            }
        )
        report = execute(filters=filters)
        row = report[1][0]

        self.assertEqual(row["total_holidays"], 2)

    def test_detailed_view_with_date_range_and_group_by_filter(self):
        today = getdate()
        mark_attendance(self.employee, today, "Absent", "Day Shift")
        mark_attendance(self.employee, today + relativedelta(days=1), "Present", "Day Shift")

        mark_attendance(self.employee, today + relativedelta(days=2), "On Leave")
        mark_attendance(self.employee, today + relativedelta(days=3), "Present")
        filters = frappe._dict(
            {
                "filter_based_on": "Date Range",
                "start_date": add_days(today, -1),
                "end_date": add_days(today, 30),
                "company": self.company,
                "group_by": "Department",
            }
        )
        report = execute(filters=filters)
        day_shift_row = report[1][1]
        row_without_shift = report[1][2]

        self.assertEqual(day_shift_row["shift"], "Day Shift")
        self.assertEqual(day_shift_row[date_key(today)], "A")
        self.assertEqual(day_shift_row[date_key(add_days(today, 1))], "P")

        self.assertEqual(row_without_shift["shift"], "")
        self.assertEqual(row_without_shift[date_key(add_days(today, 3))], "P")

        self.assertTrue(
            day_shift_row[date_key(add_days(today, 2))]
            == row_without_shift[date_key(add_days(today, 2))]
            == "L"
        )


def get_leave_application(employee, date=None):
    if not date:
        date = get_first_day_for_prev_month()

    year_start = getdate(get_year_start(date))
    year_end = getdate(get_year_ending(date))
    try:
        make_allocation_record(employee=employee, from_date=year_start, to_date=year_end)
    except OverlapError:
        pass
    from_date = date.replace(day=7)
    to_date = date.replace(day=8)

    return make_leave_application(employee, from_date, to_date, "_Test Leave Type")


def execute_report_with_invalid_filters(invalid_filter_name):
    match invalid_filter_name:
        case "filter_based_on":
            filters = frappe._dict({"company": "_Test Company", "group_by": "Department"})
        case "month":
            filters = frappe._dict(
                {"filter_based_on": "Month", "company": "_Test Company", "group_by": "Department"}
            )
        case "start_date":
            filters = frappe._dict(
                {"filter_based_on": "Date Range", "company": "_Test Company", "group_by": "Department"}
            )

    execute(filters=filters)


def date_key(date_obj):
    return date_obj.strftime("%d-%m-%Y")


def create_branch(branch_name):
    if not frappe.db.exists("Branch", branch_name):
        frappe.get_doc({"doctype": "Branch", "branch": branch_name}).insert(ignore_permissions=True)
    return branch_name


def add_holiday_to_list(holiday_list_name, holiday_date, description="Test Holiday"):
    hl = frappe.get_doc("Holiday List", holiday_list_name)
    hl.append("holidays", {"holiday_date": holiday_date, "description": description, "weekly_off": 0})
    hl.save()
