from unittest.mock import patch

import frappe
from frappe.utils import (
    add_days,
    add_months,
    add_to_date,
    get_first_day,
    get_last_day,
    get_year_ending,
    get_year_start,
    getdate,
)
from frappe.utils.user import add_role

from hrms.hr.doctype.holiday_list_assignment.test_holiday_list_assignment import assign_holiday_list
from hrms.hr.doctype.leave_allocation.test_leave_allocation import create_leave_allocation
from hrms.hr.doctype.leave_application.leave_application import (
    get_leave_balance_on,
    get_leave_details,
)
from hrms.hr.doctype.leave_application.test_leave_application import make_leave_application
from hrms.hr.doctype.leave_policy_assignment.leave_policy_assignment import (
    calculate_pro_rated_leaves,
    create_assignment_for_multiple_employees,
)
from hrms.hr.utils import allocate_earned_leaves, round_earned_leaves
from hrms.payroll.doctype.salary_slip.test_salary_slip import make_holiday_list
from hrms.tests.test_utils import get_first_sunday
from hrms.tests.utils import HRMSTestSuite


class TestLeaveAllocation(HRMSTestSuite):
    def setUp(self):
        employee = frappe.get_doc("Employee", {"first_name": "_Test Employee"})
        self.original_doj = employee.date_of_joining
        employee.date_of_joining = add_months(getdate(), -24)
        employee.save()

        self.employee2 = frappe.get_doc("Employee", {"first_name": "_Test Employee 1"})
        self.employee2.date_of_joining = add_months(getdate(), -24)
        self.employee2.save()

        self.employee = employee

        self.leave_type = create_earned_leave_type(
            "Test Earned Leave", "First Day", "0.5", earned_leave_frequency="Monthly"
        ).name
        from_date = get_year_start(getdate())
        to_date = get_year_ending(getdate())
        self.holiday_list = make_holiday_list(from_date=from_date, to_date=to_date)
        frappe.db.set_value("Email Account", "_Test Email Account 1", "default_outgoing", 1)

    def test_earned_leave_allocation(self):
        """Tests if Earned Leave allocation is 0 initially as it happens via scheduler"""
        frappe.flags.current_date = add_days(get_last_day(getdate()), -1)
        leave_policy_assignments = make_policy_assignment(self.employee)

        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 0)

    def test_earned_leave_update_after_submission(self):
        """Tests if validation error is raised when updating Earned Leave allocation after submission"""
        leave_policy_assignments = make_policy_assignment(self.employee)

        allocation = frappe.db.get_value(
            "Leave Allocation",
            {"leave_policy_assignment": leave_policy_assignments[0]},
            "name",
        )
        allocation = frappe.get_doc("Leave Allocation", allocation)
        allocation.new_leaves_allocated = 2
        self.assertRaises(frappe.ValidationError, allocation.save)

    def test_alloc_based_on_leave_period(self):
        """Case 1: Tests if assignment created one month after the leave period
        allocates 1 leave for past month"""
        start_date = get_first_day(add_months(getdate(), -1))

        frappe.flags.current_date = get_first_day(getdate())
        leave_policy_assignments = make_policy_assignment(self.employee, start_date=start_date)

        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 1)

    def test_alloc_on_month_end_based_on_leave_period(self):
        """Case 2: Tests if assignment created on the last day of the leave period's latter month
        allocates 1 leave for the current month even though the month has not ended
        since the daily job might have already executed (12:00:00 AM)"""
        start_date = get_first_day(add_months(getdate(), -2))

        frappe.flags.current_date = get_last_day(getdate())
        leave_policy_assignments = make_policy_assignment(self.employee, start_date=start_date)

        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 3)

    def test_alloc_based_on_leave_period_with_cf_leaves(self):
        """Case 3: Tests assignment created on the leave period's latter month with carry forwarding"""
        start_date = get_first_day(add_months(getdate(), -2))

        leave_allocation = create_leave_allocation(
            employee=self.employee.name,
            employee_name=self.employee.employee_name,
            leave_type="Test Earned Leave",
            from_date=add_months(getdate(), -12),
            to_date=add_months(getdate(), -3),
            new_leaves_allocated=5,
            carry_forward=0,
        )
        leave_allocation.submit()

        frappe.flags.current_date = get_last_day(add_months(getdate(), -1))
        leave_policy_assignments = make_policy_assignment(
            self.employee, start_date=start_date, carry_forward=1
        )

        details = frappe.db.get_value(
            "Leave Allocation",
            {"leave_policy_assignment": leave_policy_assignments[0]},
            ["total_leaves_allocated", "new_leaves_allocated", "unused_leaves", "name"],
            as_dict=True,
        )
        self.assertEqual(details.new_leaves_allocated, 2)
        self.assertEqual(details.unused_leaves, 5)
        self.assertEqual(details.total_leaves_allocated, 7)

    def test_alloc_based_on_joining_date(self):
        """Tests if DOJ-based assignment created 2 months after the DOJ
        allocates 3 leaves for the past 2 months"""
        self.employee.date_of_joining = get_first_day(add_months(getdate(), -2))
        self.employee.save()

        frappe.flags.current_date = get_last_day(getdate())
        """set end date while making assignment based on Joining date because while start date is fetched from
        employee master, make_policy_assignment ends up taking current date as end date if not specified which
        causes the date of assignment to be later than the end date of leave period"""
        start_date = self.employee.date_of_joining
        end_date = get_last_day(add_months(self.employee.date_of_joining, 12))
        leave_policy_assignments = make_policy_assignment(
            self.employee, assignment_based_on="Joining Date", start_date=start_date, end_date=end_date
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        effective_from = frappe.db.get_value(
            "Leave Policy Assignment", leave_policy_assignments[0], "effective_from"
        )
        self.assertEqual(effective_from, self.employee.date_of_joining)
        self.assertEqual(leaves_allocated, 3)

    def test_alloc_on_doj_based_on_leave_period(self):
        """Tests assignment with 'Allocate On=Date of Joining' based on Leave Period"""
        start_date = get_first_day(add_months(getdate(), -2))

        self.employee.date_of_joining = start_date
        self.employee.save()

        frappe.flags.current_date = get_first_day(getdate())

        leave_policy_assignments = make_policy_assignment(
            self.employee, start_date=start_date, allocate_on_day="Date of Joining"
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 3)

    def test_alloc_on_doj_based_on_joining_date(self):
        """Tests assignment with 'Allocate On=Date of Joining' based on Joining Date"""
        self.employee.date_of_joining = get_first_day(add_months(getdate(), -2))
        self.employee.save()

        frappe.flags.current_date = get_first_day(getdate())

        leave_policy_assignments = make_policy_assignment(
            self.employee,
            allocate_on_day="Date of Joining",
            assignment_based_on="Joining Date",
            end_date=get_last_day(add_months(self.employee.date_of_joining, 12)),
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        effective_from = frappe.db.get_value(
            "Leave Policy Assignment", leave_policy_assignments[0], "effective_from"
        )
        self.assertEqual(effective_from, self.employee.date_of_joining)
        self.assertEqual(leaves_allocated, 3)

    def test_earned_leaves_creation(self):
        frappe.flags.current_date = get_year_start(getdate())
        make_policy_assignment(
            self.employee,
            annual_allocation=6,
            allocate_on_day="First Day",
            start_date=frappe.flags.current_date,
        )

        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 2)
        allocate_earned_leaves_for_months(6)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 2
        )

        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 0)
        allocate_earned_leaves_for_months(6)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 4.5
        )

    def test_overallocation(self):
        """Tests earned leave allocation does not exceed annual allocation"""
        frappe.flags.current_date = get_year_start(getdate())
        make_policy_assignment(
            self.employee,
            annual_allocation=22,
            allocate_on_day="First Day",
            start_date=frappe.flags.current_date,
        )

        frappe.db.set_value("Leave Type", self.leave_type, "rounding", 1.0)
        allocate_earned_leaves_for_months(11)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 22
        )

        allocate_earned_leaves_for_months(1)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 22
        )

    def test_overallocation_when_annual_allocation_is_not_divisible(self):
        """Tests earned leave allocation is capped to the annual allocation
        when rounding up does not divide the annual allocation evenly"""
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            annual_allocation=19,
            allocate_on_day="First Day",
            start_date=frappe.flags.current_date,
            rounding=1.0,
        )[0]

        allocate_earned_leaves_for_months(12)
        self.assertEqual(get_allocated_leaves(assignment), 19)

        allocation = frappe.db.get_value("Leave Allocation", {"leave_policy_assignment": assignment}, "name")
        self.assertEqual(frappe.db.count("Earned Leave Schedule", {"parent": allocation, "failed": 1}), 0)

    def test_overallocation_without_earned_leave_schedule(self):
        """Tests earned leave allocation is capped to the annual allocation
        for allocations created before the earned leave schedule was introduced"""
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            annual_allocation=19,
            allocate_on_day="First Day",
            start_date=frappe.flags.current_date,
            rounding=1.0,
        )[0]
        allocation = frappe.db.get_value("Leave Allocation", {"leave_policy_assignment": assignment}, "name")
        frappe.db.delete("Earned Leave Schedule", {"parent": allocation})

        allocate_earned_leaves_for_months(12)
        self.assertEqual(get_allocated_leaves(assignment), 19)

    def make_capped_monthly_allocation(self):
        start_date = get_year_start(getdate())
        frappe.flags.current_date = add_days(start_date, -1)
        assignment = make_policy_assignment(
            self.employee,
            annual_allocation=19,
            allocate_on_day="First Day",
            start_date=start_date,
            end_date=get_year_ending(start_date),
            rounding=1.0,
        )[0]
        frappe.flags.current_date = start_date
        return frappe.get_doc("Leave Allocation", {"leave_policy_assignment": assignment})

    def test_existing_schedule_completes_without_quota_failure(self):
        allocation = self.make_capped_monthly_allocation()
        for row in allocation.earned_leave_schedule:
            row.db_set("number_of_leaves", 2)
        with patch("hrms.hr.utils.send_email_for_failed_allocations") as notify:
            allocate_earned_leaves()
            allocate_earned_leaves_for_months(11)
            notify.assert_not_called()
        allocation.reload()
        self.assertEqual(allocation.total_leaves_allocated, 19)
        self.assertEqual([row.number_of_leaves for row in allocation.earned_leave_schedule[-2:]], [2, 1])
        self.assertTrue(all(row.attempted and not row.failed for row in allocation.earned_leave_schedule))

    def test_legacy_allocation_without_schedule_completes_without_quota_failure(self):
        allocation = self.make_capped_monthly_allocation()
        frappe.db.delete("Earned Leave Schedule", {"parent": allocation.name})
        with patch("hrms.hr.utils.send_email_for_failed_allocations") as notify:
            allocate_earned_leaves()
            allocate_earned_leaves_for_months(11)
            notify.assert_not_called()
        allocation.reload()
        self.assertEqual(allocation.total_leaves_allocated, 19)

    def test_retry_failed_allocation_credits_remaining_annual_quota(self):
        allocation = self.make_capped_monthly_allocation()
        allocate_earned_leaves()
        allocate_earned_leaves_for_months(8)
        allocation.reload()
        self.assertEqual(allocation.total_leaves_allocated, 18)
        allocation.earned_leave_schedule[-1].db_set({"number_of_leaves": 2, "attempted": 1, "failed": 1})
        allocation.reload()
        failed = [row.as_dict() for row in allocation.earned_leave_schedule if row.failed]
        allocation.retry_failed_allocations(failed)
        self.assertEqual(allocation.total_leaves_allocated, 19)
        self.assertEqual(allocation.earned_leave_schedule[-1].number_of_leaves, 1)
        self.assertFalse(any(row.failed for row in allocation.earned_leave_schedule))
        self.assertEqual(allocation.earned_leave_schedule[-1].allocated_via, "Manually")
        allocation.retry_failed_allocations(failed)
        self.assertEqual(allocation.total_leaves_allocated, 19)

    def test_over_allocation_during_assignment_creation(self):
        """Tests backdated earned leave allocation does not exceed annual allocation"""
        start_date = get_first_day(add_months(getdate(), -12))

        self.employee.date_of_joining = start_date
        self.employee.save()

        frappe.flags.current_date = get_first_day(getdate())

        leave_policy_assignments = make_policy_assignment(
            self.employee, start_date=start_date, allocate_on_day="Date of Joining"
        )

        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 12)

    def test_overallocation_with_carry_forwarding(self):
        """Tests earned leave allocation with cf leaves does not exceed annual allocation"""
        year_start = get_year_start(getdate())

        leave_allocation = create_leave_allocation(
            employee=self.employee.name,
            employee_name=self.employee.employee_name,
            leave_type=self.leave_type,
            from_date=get_first_day(add_months(year_start, -1)),
            to_date=get_last_day(add_months(year_start, -1)),
            new_leaves_allocated=5,
            carry_forward=0,
        )
        leave_allocation.submit()

        frappe.flags.current_date = year_start
        make_policy_assignment(
            self.employee,
            annual_allocation=22,
            allocate_on_day="First Day",
            start_date=year_start,
            carry_forward=True,
        )

        frappe.db.set_value("Leave Type", self.leave_type, "rounding", 1.0)
        allocate_earned_leaves_for_months(11)

        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 27
        )

        allocate_earned_leaves_for_months(1)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 27
        )

    def test_allocate_on_first_day(self):
        """Tests assignment with 'Allocate On=First Day'"""
        start_date = get_first_day(add_months(getdate(), -1))
        prev_month_last_day = get_last_day(add_months(getdate(), -1))
        first_day = get_first_day(getdate())

        frappe.flags.current_date = prev_month_last_day
        leave_policy_assignments = make_policy_assignment(
            self.employee, allocate_on_day="First Day", start_date=start_date
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 1)

        frappe.flags.current_date = first_day
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 2)

    def test_allocate_on_last_day(self):
        """Tests assignment with 'Allocate On=Last Day'"""
        prev_month_last_day = get_last_day(add_months(getdate(), -1))
        last_day = get_last_day(getdate())

        frappe.flags.current_date = prev_month_last_day
        leave_policy_assignments = make_policy_assignment(
            self.employee, allocate_on_day="Last Day", start_date=prev_month_last_day
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 1)

        frappe.flags.current_date = last_day
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 2)

        frappe.flags.current_date = add_days(last_day, -1)
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 2)

    def test_allocate_on_date_of_joining(self):
        """Tests assignment with 'Allocate On=Date of Joining'"""
        start_date = get_first_day(add_months(getdate(), -1))
        end_date = get_last_day(start_date)
        doj = add_days(start_date, 5)
        current_month_doj = add_days(get_first_day(getdate()), 5)

        self.employee.date_of_joining = doj
        self.employee.save()

        frappe.flags.current_date = doj
        leave_policy_assignments = make_policy_assignment(
            self.employee, allocate_on_day="Date of Joining", start_date=start_date
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        pro_rated_leave = round_earned_leaves(calculate_pro_rated_leaves(1, doj, start_date, end_date), "0.5")
        self.assertEqual(leaves_allocated, pro_rated_leave)

        frappe.flags.current_date = add_days(current_month_doj, -1)
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, pro_rated_leave)

        frappe.flags.current_date = current_month_doj
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, pro_rated_leave + 1)

    def test_backdated_pro_rated_allocation(self):
        start_date = getdate("2023-01-01")

        self.employee.date_of_joining = getdate("2023-03-15")
        self.employee.save()

        frappe.flags.current_date = getdate("2023-05-16")
        leave_policy_assignments = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            start_date=start_date,
            rounding="",
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])

        self.assertEqual(leaves_allocated, 2.55)

    def test_no_pro_rated_leaves_allocated_before_effective_date(self):
        start_date = get_first_day(add_months(getdate(), -1))
        doj = add_days(start_date, 5)

        self.employee.date_of_joining = doj
        self.employee.save()

        frappe.flags.current_date = add_days(doj, -1)
        leave_policy_assignments = make_policy_assignment(
            self.employee, allocate_on_day="Date of Joining", start_date=start_date
        )
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        self.assertEqual(leaves_allocated, 0.0)

    def test_pro_rated_allocation_via_scheduler(self):
        start_date = get_first_day(add_months(getdate(), -1))
        doj = add_days(start_date, 5)

        self.employee.date_of_joining = doj
        self.employee.save()

        frappe.flags.current_date = add_days(doj, -1)
        leave_policy_assignments = make_policy_assignment(
            self.employee, allocate_on_day="First Day", start_date=start_date
        )

        frappe.flags.current_date = add_days(doj, -1)
        allocate_earned_leaves()
        leaves_allocated = get_allocated_leaves(leave_policy_assignments[0])
        pro_rated_leave = round_earned_leaves(
            calculate_pro_rated_leaves(1, doj, start_date, get_last_day(start_date)), "0.5"
        )
        self.assertEqual(leaves_allocated, pro_rated_leave)

    @assign_holiday_list("Salary Slip Test Holiday List", "_Test Company")
    def test_get_earned_leave_details_for_dashboard(self):
        frappe.flags.current_date = get_year_start(getdate())
        first_sunday = get_first_sunday(self.holiday_list, for_date=frappe.flags.current_date)

        leave_policy_assignments = make_policy_assignment(
            self.employee,
            annual_allocation=6,
            allocate_on_day="First Day",
            start_date=add_months(frappe.flags.current_date, -3),
        )
        allocation = frappe.db.get_value(
            "Leave Allocation",
            {"leave_policy_assignment": leave_policy_assignments[0]},
            "name",
        )
        allocation = frappe.get_doc("Leave Allocation", allocation)

        allocate_earned_leaves_for_months(6)

        leave_date = add_days(first_sunday, 1)
        make_leave_application(self.employee.name, leave_date, leave_date, self.leave_type)

        details = get_leave_details(self.employee.name, allocation.from_date)
        leave_allocation = details["leave_allocation"][self.leave_type]
        expected = {
            "total_leaves": 2.0,
            "expired_leaves": 0.0,
            "leaves_taken": 1.0,
            "leaves_pending_approval": 0.0,
            "remaining_leaves": 1.0,
        }
        self.assertEqual(leave_allocation, expected)

        details = get_leave_details(self.employee.name, frappe.flags.current_date)
        leave_allocation = details["leave_allocation"][self.leave_type]
        expected = {
            "total_leaves": 5.0,
            "expired_leaves": 0.0,
            "leaves_taken": 1.0,
            "leaves_pending_approval": 0.0,
            "remaining_leaves": 4.0,
        }
        self.assertEqual(leave_allocation, expected)

    def test_allocate_leaves_manually(self):
        frappe.flags.current_date = get_year_start(getdate())
        lpas = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            start_date=frappe.flags.current_date,
        )

        leave_allocation = frappe.get_last_doc(
            "Leave Allocation", filters={"leave_policy_assignment": lpas[0]}
        )
        leave_allocation.allocate_leaves_manually(1)
        leave_allocation.allocate_leaves_manually(1)
        leave_allocation.allocate_leaves_manually(1)
        leave_allocation.allocate_leaves_manually(1)
        leave_allocation.allocate_leaves_manually(1)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 6
        )

        leave_allocation.allocate_leaves_manually(5)
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 11
        )

        leave_allocation.allocate_leaves_manually(1, add_days(frappe.flags.current_date, 1))
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date), 11
        )
        self.assertEqual(
            get_leave_balance_on(self.employee.name, self.leave_type, add_days(frappe.flags.current_date, 1)),
            12,
        )

        self.assertRaises(frappe.ValidationError, leave_allocation.allocate_leaves_manually, 1)

    def test_quarterly_earned_leaves_allocated_on_last_day_in_the_middle_of_leave_period(self):
        frappe.flags.current_date = add_months(get_year_start(getdate()), 4)

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Quarterly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 3.0)

    def test_quarterly_earned_leaves_allocated_on_last_day_at_the_start_of_the_leave_period(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Quarterly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 0.0)

    def test_quartertly_earned_leaves_allocated_on_first_day_at_the_start_of_leave_period(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Quarterly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 3.0)

    def test_quarterly_earned_leaves_allocated_by_the_scheduler(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Quarterly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        frappe.flags.current_date = add_months(get_year_start(getdate()), 3)

        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 6)

        frappe.flags.current_date = add_months(get_year_start(getdate()), 9)
        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 9)

    def test_quarterly_leaves_allocated_pro_rated(self):

        self.employee2.date_of_joining = add_to_date(get_year_start(getdate()), months=1, days=10)
        self.employee2.save()

        frappe.flags.current_date = add_to_date(get_year_start(getdate()), months=1, days=10)
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Quarterly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 0)

        frappe.flags.current_date = add_to_date(get_year_start(getdate()), months=3, days=-1)
        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 1.75)

    def test_half_yearly_earned_leaves_allocated_on_last_day_at_the_start_of_leave_period(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Half-Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 0.0)

    def test_half_yearly_earned_leaves_allocated_on_last_day_in_the_middle_of_leave_period(self):
        frappe.flags.current_date = add_months(get_year_start(getdate()), 7)

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Half-Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 6.0)

    def test_half_yearly_earned_leaves_allocated_on_first_day_at_the_start_of_leave_period(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Half-Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 6.0)

    def test_half_yearly_earned_leaves_allocated_by_the_scheduler(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Half-Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 6)

        frappe.flags.current_date = add_months(get_year_start(getdate()), 6)

        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 12)

    def test_half_yearly_leaves_allocated_pro_rated(self):
        self.employee2.date_of_joining = add_to_date(get_year_start(getdate()), months=3, days=25)
        self.employee2.save()

        frappe.flags.current_date = add_to_date(get_year_start(getdate()), months=3, days=25)
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Half-Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 0)

        frappe.flags.current_date = add_to_date(get_year_start(getdate()), months=6, days=-1)
        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 2.25)

    def test_yearly_leaves_allocated_on_last_day_at_the_start_of_the_period(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=add_to_date(get_year_ending(getdate()), years=4),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 0.0)

    def test_yearly_leaves_allocated_on_last_day_in_the_middle_of_the_period(self):
        frappe.flags.current_date = add_to_date(get_year_start(getdate()), years=2)
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=add_to_date(get_year_ending(getdate()), years=4),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 24.0)

    def test_yearly_leaves_allocated_on_first_day_at_the_start_of_the_period(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=add_to_date(get_year_ending(getdate()), years=4),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 12.0)

    def test_yearly_leaves_allocated_by_scheduler(self):
        frappe.flags.current_date = get_year_start(getdate())

        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="First Day",
            earned_leave_frequency="Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=add_to_date(get_year_ending(getdate()), years=4),
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 12)

        frappe.flags.current_date = add_months(get_year_start(getdate()), 12)

        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 24)

    def test_yearly_leaves_allocated_pro_rated(self):
        self.employee2.date_of_joining = add_to_date(get_year_start(getdate()), months=7, days=15)
        self.employee2.save()

        frappe.flags.current_date = add_to_date(get_year_start(getdate()), months=7, days=15)
        assignment = make_policy_assignment(
            self.employee2,
            allocate_on_day="Last Day",
            earned_leave_frequency="Yearly",
            annual_allocation=12,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=add_to_date(get_year_ending(getdate()), years=4),
            rounding=0.25,
        )[0]

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )

        self.assertEqual(total_leaves_allocated, 0)

        frappe.flags.current_date = get_year_ending(getdate())
        allocate_earned_leaves()

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee2.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 4.5)

    def test_error_logging_failed_allocations(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            earned_leave_frequency="Monthly",
            annual_allocation=24,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]
        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 2)
        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 2)
        frappe.flags.current_date = add_months(get_year_start(getdate()), 1)
        allocate_earned_leaves()
        error_log = frappe.db.get_value("Error Log", {"reference_doctype": "Leave Allocation"})
        self.assertIsNotNone(error_log)

    def test_send_email_for_failed_allocations(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            earned_leave_frequency="Monthly",
            annual_allocation=24,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]
        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 2)
        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 2)
        frappe.flags.current_date = add_months(get_year_start(getdate()), 1)
        allocate_earned_leaves()
        email = frappe.db.get_values(
            "Email Queue", {"message": ("like Failure of Automatic Allocation of Earned Leaves%")}
        )
        self.assertIsNotNone(email)

    def test_retry_failed_allocations(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            earned_leave_frequency="Monthly",
            annual_allocation=24,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]
        leave_allocation = frappe.get_doc(
            "Leave Allocation", {"employee": self.employee.name, "leave_policy_assignment": assignment}
        )
        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 2)
        frappe.flags.current_date = add_months(get_year_start(getdate()), 1)
        allocate_earned_leaves()
        frappe.flags.current_date = add_months(get_year_start(getdate()), 2)
        allocate_earned_leaves()
        failed_allocations = frappe.get_all(
            "Earned Leave Schedule", {"parent": leave_allocation.name, "attempted": 1, "failed": 1}, ["*"]
        )
        self.assertEqual(len(failed_allocations), 2)
        frappe.db.set_value("Leave Type", self.leave_type, "max_leaves_allowed", 0)
        leave_allocation.retry_failed_allocations(failed_allocations)
        failed_allocations = frappe.get_all(
            "Earned Leave Schedule", {"parent": leave_allocation.name, "attempted": 1, "failed": 1}
        )
        self.assertFalse(failed_allocations)

        total_leaves_allocated = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee.name, "leave_policy_assignment": assignment},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated, 6)

    def test_permission_check_for_retrying_failed_allocation(self):
        frappe.flags.current_date = get_year_start(getdate())
        assignment = make_policy_assignment(
            self.employee,
            allocate_on_day="First Day",
            earned_leave_frequency="Monthly",
            annual_allocation=24,
            assignment_based_on="Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
            rounding=0.25,
        )[0]
        leave_allocation = frappe.get_doc(
            "Leave Allocation", {"employee": self.employee.name, "leave_policy_assignment": assignment}
        )
        failed_allocations = frappe.get_all(
            "Earned Leave Schedule", {"parent": leave_allocation.name, "attempted": 1, "failed": 1}, ["*"]
        )
        frappe.set_user(self.employee.user_id)
        self.assertRaises(
            frappe.PermissionError, leave_allocation.retry_failed_allocations, failed_allocations
        )
        add_role(self.employee.user_id, "HR Manager")
        leave_allocation.retry_failed_allocations(failed_allocations)
        failed_allocations = frappe.get_all(
            "Earned Leave Schedule", {"parent": leave_allocation.name, "attempted": 1, "failed": 1}, ["*"]
        )
        self.assertFalse(failed_allocations)
        frappe.set_user("Administrator")
        frappe.get_doc("User", self.employee.user_id).remove_roles("HR Manager")

    def test_allocating_earned_leave_when_schedule_doesnt_exist(self):
        frappe.flags.current_date = get_year_start(getdate())
        employee1 = self.employee2
        employee2 = frappe.copy_doc(employee1)
        employee2.user_id = None
        employee2.insert()

        leave_period = create_leave_period(
            "Test Earned Leave Period",
            start_date=get_year_start(getdate()),
            end_date=get_year_ending(getdate()),
        )
        leave_policy = frappe.get_doc(
            {
                "doctype": "Leave Policy",
                "title": "Test Earned Leave Policy",
                "leave_policy_details": [{"leave_type": self.leave_type, "annual_allocation": 24}],
            }
        ).insert()

        data = {
            "assignment_based_on": "Leave Period",
            "leave_policy": leave_policy.name,
            "leave_period": leave_period.name,
            "carry_forward": 0,
            "effective_from": get_year_start(getdate()),
            "effective_to": get_year_ending(getdate()),
        }

        leave_policy_assignments = create_assignment_for_multiple_employees(
            [self.employee.name, employee1.name, employee2.name], frappe._dict(data)
        )
        leave_allocations = frappe.db.get_values(
            "Leave Allocation", {"employee": ("in", (employee1.name, employee2.name))}, pluck=True
        )
        frappe.db.delete("Earned Leave Schedule", {"parent": ("in", leave_allocations)})
        frappe.flags.current_date = add_months(get_year_start(getdate()), 1)
        allocate_earned_leaves()
        total_leaves_allocated_with_no_schedule = frappe.db.get_values(
            "Leave Allocation",
            {
                "employee": ("in", (employee1.name, employee2.name)),
                "leave_policy_assignment": ("in", leave_policy_assignments[1:]),
            },
            "total_leaves_allocated",
            pluck=True,
        )

        total_leaves_allocated_with_schedule = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee.name, "leave_policy_assignment": leave_policy_assignments[0]},
            "total_leaves_allocated",
        )
        self.assertEqual(total_leaves_allocated_with_no_schedule[0], 4)
        self.assertEqual(total_leaves_allocated_with_no_schedule[1], 4)
        self.assertEqual(total_leaves_allocated_with_schedule, 4)

        frappe.delete_doc_if_exists("Employee", employee2.name, force=1)

    def test_exceed_newly_allocated_leaves(self):
        this_year_start = get_year_start(getdate())
        this_year_end = get_year_ending(getdate())
        last_year_start = add_months(this_year_start, -12)
        last_year_end = add_months(this_year_end, -12)

        make_policy_assignment(
            self.employee,
            allocate_on_day="Last Day",
            start_date=last_year_start,
            end_date=last_year_end,
            earned_leave_frequency="Monthly",
            annual_allocation=11,
        )
        frappe.flags.current_date = this_year_start
        make_policy_assignment(
            self.employee,
            allocate_on_day="Last Day",
            start_date=this_year_start,
            end_date=this_year_end,
            earned_leave_frequency="Monthly",
            annual_allocation=24,
            carry_forward=1,
        )
        frappe.db.set_value("Leave Type", "Test Earned Leave", "max_leaves_allowed", 12)
        frappe.flags.current_date = get_last_day(this_year_start)
        allocate_earned_leaves()
        leave_balance = get_leave_balance_on(self.employee.name, self.leave_type, frappe.flags.current_date)
        leave_allocation = frappe.get_value(
            "Leave Allocation",
            {"employee": self.employee.name, "leave_type": "Test Earned Leave", "from_date": this_year_start},
            ["total_leaves_allocated", "name"],
            as_dict=1,
        )
        self.assertEqual(leave_allocation.total_leaves_allocated, 12)
        self.assertEqual(leave_balance, 12)

        earned_leaves_allocated = frappe.get_value(
            "Earned Leave Schedule",
            {"parent": leave_allocation.name, "allocation_date": frappe.flags.current_date},
            "number_of_leaves",
        )
        self.assertEqual(earned_leaves_allocated, 1)


def create_earned_leave_type(
    leave_type, allocate_on_day="Last Day", rounding=0.5, earned_leave_frequency="Monthly"
):
    if frappe.db.exists("Leave Type", leave_type):
        doc = frappe.get_doc("Leave Type", leave_type)
        doc.update(
            {
                "allocate_on_day": allocate_on_day,
                "rounding": rounding,
                "earned_leave_frequency": earned_leave_frequency,
            }
        )
        doc.save()
        return doc
    else:
        return frappe.get_doc(
            leave_type_name=leave_type,
            doctype="Leave Type",
            is_earned_leave=1,
            earned_leave_frequency=earned_leave_frequency,
            rounding=rounding,
            is_carry_forward=1,
            allocate_on_day=allocate_on_day,
            max_leaves_allowed=0,
        ).insert()


def create_leave_period(name, start_date=None, end_date=None):
    frappe.delete_doc_if_exists("Leave Period", name, force=1)

    if not start_date:
        start_date = get_first_day(getdate())

    return frappe.get_doc(
        name=name,
        doctype="Leave Period",
        from_date=start_date,
        to_date=end_date or add_months(start_date, 12),
        company="_Test Company",
        is_active=1,
    ).insert()


def make_policy_assignment(
    employee,
    allocate_on_day="Last Day",
    rounding=0.5,
    earned_leave_frequency="Monthly",
    start_date=None,
    end_date=None,
    annual_allocation=12,
    carry_forward=0,
    assignment_based_on="Leave Period",
):
    leave_type = create_earned_leave_type(
        "Test Earned Leave", allocate_on_day, rounding, earned_leave_frequency=earned_leave_frequency
    )
    leave_period = create_leave_period("Test Earned Leave Period", start_date=start_date, end_date=end_date)
    leave_policy = frappe.get_doc(
        {
            "doctype": "Leave Policy",
            "title": "Test Earned Leave Policy",
            "leave_policy_details": [{"leave_type": leave_type.name, "annual_allocation": annual_allocation}],
        }
    ).insert()

    data = {
        "assignment_based_on": assignment_based_on,
        "leave_policy": leave_policy.name,
        "leave_period": leave_period.name,
        "carry_forward": carry_forward,
        "effective_from": start_date,
        "effective_to": end_date,
    }

    leave_policy_assignments = create_assignment_for_multiple_employees([employee.name], frappe._dict(data))
    return leave_policy_assignments


def get_allocated_leaves(assignment):
    return frappe.db.get_value(
        "Leave Allocation",
        {"leave_policy_assignment": assignment},
        "total_leaves_allocated",
    )


def allocate_earned_leaves_for_months(months):
    for _ in range(0, months):
        frappe.flags.current_date = add_months(frappe.flags.current_date, 1)
        allocate_earned_leaves()
