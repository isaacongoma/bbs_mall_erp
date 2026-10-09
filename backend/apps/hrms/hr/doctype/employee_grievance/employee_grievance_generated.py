from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeGrievanceGenerated(FrappeModel):
    doctype = 'Employee Grievance'
    grievance_type = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    description = models.TextField(blank=True, null=True, default='')
    cause_of_grievance = models.TextField(blank=True, null=True, default='')
    resolved_by = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_responsible = models.CharField(max_length=140, blank=True, null=True, default='')
    resolution_detail = models.TextField(blank=True, null=True, default='')
    resolution_date = models.DateField(null=True, blank=True)
    grievance_against = models.CharField(max_length=140, blank=True, null=True, default='')
    raised_by = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    reports_to = models.CharField(max_length=140, blank=True, null=True, default='')
    grievance_against_party = models.CharField(max_length=140, blank=True, null=True, default='')
    associated_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    associated_document = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
