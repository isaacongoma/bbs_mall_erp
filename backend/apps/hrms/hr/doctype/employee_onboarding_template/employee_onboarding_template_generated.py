from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeOnboardingTemplateGenerated(FrappeModel):
    doctype = 'Employee Onboarding Template'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_grade = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
