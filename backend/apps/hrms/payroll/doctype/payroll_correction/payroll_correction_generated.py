from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PayrollCorrectionGenerated(FrappeModel):
    doctype = 'Payroll Correction'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_period = models.CharField(max_length=140, blank=True, null=True, default='')
    month_for_lwp_reversal = models.CharField(max_length=140, blank=True, null=True, default='')
    salary_slip_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    working_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    lwp_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    days_to_reverse = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payroll_date = models.DateField(null=True, blank=True)
    payment_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
