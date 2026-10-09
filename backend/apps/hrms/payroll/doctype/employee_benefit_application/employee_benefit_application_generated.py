from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeBenefitApplicationGenerated(FrappeModel):
    doctype = 'Employee Benefit Application'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    max_benefits = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    remaining_benefit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    payroll_period = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
