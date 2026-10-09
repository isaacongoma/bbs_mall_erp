from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeOnboardingGenerated(FrappeModel):
    doctype = 'Employee Onboarding'
    job_offer = models.CharField(max_length=140, blank=True, null=True, default='')
    job_applicant = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    date_of_joining = models.DateField(null=True, blank=True)
    boarding_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    notify_users_by_email = models.SmallIntegerField(default=0)
    employee_onboarding_template = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_grade = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    boarding_begins_on = models.DateField(null=True, blank=True)
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
