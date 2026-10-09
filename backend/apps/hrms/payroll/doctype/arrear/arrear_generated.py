from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ArrearGenerated(FrappeModel):
    doctype = 'Arrear'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_period = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_date = models.DateField(null=True, blank=True)
    arrear_start_date = models.DateField(null=True, blank=True)
    salary_structure = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
