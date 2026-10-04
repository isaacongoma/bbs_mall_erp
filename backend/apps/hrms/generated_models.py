from django.db import models

from apps.hrms.hr.doctype.employment_type.employment_type_generated import EmploymentTypeGenerated
from apps.hrms.hr.doctype.employee_grade.employee_grade_generated import EmployeeGradeGenerated
from apps.hrms.hr.doctype.designation_skill.designation_skill_generated import DesignationSkillGenerated
from apps.hrms.hr.doctype.leave_type.leave_type_generated import LeaveTypeGenerated
from apps.hrms.hr.doctype.holiday_list_assignment.holiday_list_assignment_generated import HolidayListAssignmentGenerated
from apps.hrms.hr.doctype.shift_type.shift_type_generated import ShiftTypeGenerated
from apps.hrms.hr.doctype.identification_document_type.identification_document_type_generated import IdentificationDocumentTypeGenerated
from apps.hrms.hr.doctype.interest.interest_generated import InterestGenerated

class EmploymentType(EmploymentTypeGenerated):
    class Meta:
        db_table = 'tabEmployment Type'
        verbose_name = 'Employment Type'
        ordering = ['-creation']


class EmployeeGrade(EmployeeGradeGenerated):
    class Meta:
        db_table = 'tabEmployee Grade'
        verbose_name = 'Employee Grade'
        ordering = ['-creation']


class DesignationSkill(DesignationSkillGenerated):
    class Meta:
        db_table = 'tabDesignation Skill'
        verbose_name = 'Designation Skill'
        ordering = ['creation']


class LeaveType(LeaveTypeGenerated):
    class Meta:
        db_table = 'tabLeave Type'
        verbose_name = 'Leave Type'
        ordering = ['-creation']


class HolidayListAssignment(HolidayListAssignmentGenerated):
    class Meta:
        db_table = 'tabHoliday List Assignment'
        verbose_name = 'Holiday List Assignment'
        ordering = ['-creation']


class ShiftType(ShiftTypeGenerated):
    class Meta:
        db_table = 'tabShift Type'
        verbose_name = 'Shift Type'
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


