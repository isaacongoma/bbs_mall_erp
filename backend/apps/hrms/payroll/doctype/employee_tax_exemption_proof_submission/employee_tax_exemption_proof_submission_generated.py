from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeTaxExemptionProofSubmissionGenerated(FrappeModel):
    doctype = 'Employee Tax Exemption Proof Submission'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    submission_date = models.DateField(null=True, blank=True)
    payroll_period = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_actual_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exemption_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    attachments = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
