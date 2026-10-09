from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeBenefitClaimGenerated(FrappeModel):
    doctype = 'Employee Benefit Claim'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    earning_component = models.CharField(max_length=140, blank=True, null=True, default='')
    max_amount_eligible = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    claimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    attachments = models.TextField(blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_date = models.DateField(null=True, blank=True)
    yearly_benefit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
