from django.db import models

from apps.hrms.hr.doctype.attendance.attendance_generated import AttendanceGenerated
from apps.hrms.hr.doctype.designation_skill.designation_skill_generated import DesignationSkillGenerated
from apps.hrms.hr.doctype.employee_checkin.employee_checkin_generated import EmployeeCheckinGenerated
from apps.hrms.hr.doctype.employee_grade.employee_grade_generated import EmployeeGradeGenerated
from apps.hrms.hr.doctype.employment_type.employment_type_generated import EmploymentTypeGenerated
from apps.hrms.hr.doctype.holiday_list_assignment.holiday_list_assignment_generated import HolidayListAssignmentGenerated
from apps.hrms.hr.doctype.identification_document_type.identification_document_type_generated import IdentificationDocumentTypeGenerated
from apps.hrms.hr.doctype.interest.interest_generated import InterestGenerated
from apps.hrms.hr.doctype.leave_allocation.leave_allocation_generated import LeaveAllocationGenerated
from apps.hrms.hr.doctype.leave_policy_assignment.leave_policy_assignment_generated import LeavePolicyAssignmentGenerated
from apps.hrms.hr.doctype.leave_type.leave_type_generated import LeaveTypeGenerated
from apps.hrms.hr.doctype.shift_assignment.shift_assignment_generated import ShiftAssignmentGenerated
from apps.hrms.hr.doctype.shift_type.shift_type_generated import ShiftTypeGenerated
from apps.hrms.payroll.doctype.payroll_period.payroll_period_generated import PayrollPeriodGenerated
from apps.hrms.payroll.doctype.salary_structure.salary_structure_generated import SalaryStructureGenerated
from apps.hrms.payroll.doctype.salary_structure_assignment.salary_structure_assignment_generated import SalaryStructureAssignmentGenerated

class Attendance(AttendanceGenerated):
    class Meta:
        db_table = 'tabAttendance'
        verbose_name = 'Attendance'
        ordering = ['-creation']


class DesignationSkill(DesignationSkillGenerated):
    class Meta:
        db_table = 'tabDesignation Skill'
        verbose_name = 'Designation Skill'
        ordering = ['creation']


class EmployeeCheckin(EmployeeCheckinGenerated):
    class Meta:
        db_table = 'tabEmployee Checkin'
        verbose_name = 'Employee Checkin'
        ordering = ['creation']


class EmployeeGrade(EmployeeGradeGenerated):
    class Meta:
        db_table = 'tabEmployee Grade'
        verbose_name = 'Employee Grade'
        ordering = ['-creation']


class EmploymentType(EmploymentTypeGenerated):
    class Meta:
        db_table = 'tabEmployment Type'
        verbose_name = 'Employment Type'
        ordering = ['-creation']


class HolidayListAssignment(HolidayListAssignmentGenerated):
    class Meta:
        db_table = 'tabHoliday List Assignment'
        verbose_name = 'Holiday List Assignment'
        ordering = ['-creation']


class IdentificationDocumentType(IdentificationDocumentTypeGenerated):
    class Meta:
        db_table = 'tabIdentification Document Type'
        verbose_name = 'Identification Document Type'
        ordering = ['-creation']


class Interest(InterestGenerated):
    class Meta:
        db_table = 'tabInterest'
        verbose_name = 'Interest'
        ordering = ['-creation']


class LeaveAllocation(LeaveAllocationGenerated):
    class Meta:
        db_table = 'tabLeave Allocation'
        verbose_name = 'Leave Allocation'
        ordering = ['-creation']


class LeavePolicyAssignment(LeavePolicyAssignmentGenerated):
    class Meta:
        db_table = 'tabLeave Policy Assignment'
        verbose_name = 'Leave Policy Assignment'
        ordering = ['-creation']


class LeaveType(LeaveTypeGenerated):
    class Meta:
        db_table = 'tabLeave Type'
        verbose_name = 'Leave Type'
        ordering = ['-creation']


class ShiftAssignment(ShiftAssignmentGenerated):
    class Meta:
        db_table = 'tabShift Assignment'
        verbose_name = 'Shift Assignment'
        ordering = ['-creation']


class ShiftType(ShiftTypeGenerated):
    class Meta:
        db_table = 'tabShift Type'
        verbose_name = 'Shift Type'
        ordering = ['-creation']


class PayrollPeriod(PayrollPeriodGenerated):
    class Meta:
        db_table = 'tabPayroll Period'
        verbose_name = 'Payroll Period'
        ordering = ['-creation']


class SalaryStructure(SalaryStructureGenerated):
    class Meta:
        db_table = 'tabSalary Structure'
        verbose_name = 'Salary Structure'
        ordering = ['-creation']


class SalaryStructureAssignment(SalaryStructureAssignmentGenerated):
    class Meta:
        db_table = 'tabSalary Structure Assignment'
        verbose_name = 'Salary Structure Assignment'
        ordering = ['-creation']


