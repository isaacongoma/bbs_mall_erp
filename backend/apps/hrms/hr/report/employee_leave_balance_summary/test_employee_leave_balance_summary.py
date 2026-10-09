import frappe
from frappe.utils import add_days, flt, get_year_ending, get_year_start, getdate

from erpnext.setup.doctype.employee.test_employee import make_employee

from hrms.hr.doctype.holiday_list_assignment.test_holiday_list_assignment import assign_holiday_list
from hrms.hr.doctype.leave_application.test_leave_application import make_allocation_record
from hrms.hr.doctype.leave_ledger_entry.leave_ledger_entry import process_expired_allocation
from hrms.hr.report.employee_leave_balance_summary.employee_leave_balance_summary import execute
from hrms.payroll.doctype.salary_slip.test_salary_slip import (
    make_holiday_list,
    make_leave_application,
)
from hrms.tests.test_utils import get_first_sunday
from hrms.tests.utils import HRMSTestSuite

test_records = frappe.get_test_records("Leave Type")


class TestEmployeeLeaveBalance(HRMSTestSuite):
    def setUp(self):
        for dt in [
            "Leave Application",
            "Leave Allocation",
            "Salary Slip",
            "Leave Ledger Entry",
            "Leave Type",
        ]:
            frappe.db.delete(dt)

        frappe.set_user("Administrator")

        self.employee_id = make_employee("test_emp_leave_balance@example.com", company="_Test Company")

        self.date = getdate()
        self.year_start = getdate(get_year_start(self.date))
        self.year_end = getdate(get_year_ending(self.date))

        self.holiday_list = make_holiday_list(
            "_Test Emp Balance Holiday List", self.year_start, self.year_end
        )

    @assign_holiday_list("_Test Emp Balance Holiday List", "_Test Company")
    def test_employee_leave_balance_summary(self):
        frappe.get_doc(test_records[0]).insert()

        allocation1 = make_allocation_record(
            employee=self.employee_id,
            from_date=add_days(self.year_start, -11),
            to_date=add_days(self.year_start, -1),
            leaves=5,
        )
        allocation2 = make_allocation_record(
            employee=self.employee_id, from_date=self.year_start, to_date=self.year_end
        )

        leave_application1 = make_leave_application(
            self.employee_id,
            add_days(self.year_start, -11),
            add_days(self.year_start, -10),
            "_Test Leave Type",
        )
        leave_application1.reload()

        process_expired_allocation()

        first_sunday = get_first_sunday(self.holiday_list, for_date=self.year_start)
        leave_application2 = make_leave_application(
            self.employee_id, add_days(first_sunday, 1), add_days(first_sunday, 4), "_Test Leave Type"
        )
        leave_application2.reload()

        filters = frappe._dict(
            {
                "date": add_days(leave_application2.to_date, 1),
                "company": "_Test Company",
                "employee": self.employee_id,
            }
        )

        report = execute(filters)

        expected_data = [
            [
                self.employee_id,
                "test_emp_leave_balance@example.com",
                frappe.db.get_value("Employee", self.employee_id, "department"),
                flt(
                    allocation1.new_leaves_allocated
                    + allocation2.new_leaves_allocated
                    - leave_application1.total_leave_days
                    - (
                        allocation1.new_leaves_allocated - leave_application1.total_leave_days
                    )
                    - leave_application2.total_leave_days
                ),
            ]
        ]

        self.assertEqual(report[1], expected_data)

    @assign_holiday_list("_Test Emp Balance Holiday List", "_Test Company")
    def test_get_leave_balance_near_alloc_expiry(self):
        frappe.get_doc(test_records[0]).insert()

        allocation = make_allocation_record(
            employee=self.employee_id, from_date=self.year_start, to_date=self.year_end
        )
        first_sunday = get_first_sunday(self.holiday_list, for_date=self.year_start)
        leave_application = make_leave_application(
            self.employee_id, add_days(first_sunday, 1), add_days(first_sunday, 4), "_Test Leave Type"
        )
        leave_application.reload()

        filters = frappe._dict(
            {"date": add_days(self.year_end, -3), "company": "_Test Company", "employee": self.employee_id}
        )
        report = execute(filters)

        expected_data = [
            [
                self.employee_id,
                "test_emp_leave_balance@example.com",
                frappe.db.get_value("Employee", self.employee_id, "department"),
                flt(allocation.new_leaves_allocated - leave_application.total_leave_days),
            ]
        ]

        self.assertEqual(report[1], expected_data)

    @assign_holiday_list("_Test Emp Balance Holiday List", "_Test Company")
    def test_employee_status_filter(self):
        frappe.get_doc(test_records[0]).insert()

        inactive_emp = make_employee("test_emp_status@example.com", company="_Test Company")
        allocation = make_allocation_record(
            employee=inactive_emp, from_date=self.year_start, to_date=self.year_end
        )

        frappe.db.set_value("Employee", inactive_emp, "status", "Inactive")

        filters = frappe._dict(
            {
                "date": allocation.from_date,
                "company": "_Test Company",
                "employee": inactive_emp,
                "employee_status": "Active",
            }
        )
        report = execute(filters)
        self.assertEqual(len(report[1]), 0)

        filters = frappe._dict(
            {
                "date": allocation.from_date,
                "company": "_Test Company",
                "employee": inactive_emp,
                "employee_status": "Inactive",
            }
        )
        report = execute(filters)
        self.assertEqual(len(report[1]), 1)
