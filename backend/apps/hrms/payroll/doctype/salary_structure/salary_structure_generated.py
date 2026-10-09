from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryStructureGenerated(FrappeModel):
    doctype = 'Salary Structure'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    is_active = models.CharField(max_length=140, blank=True, null=True, default='Yes')
    payroll_frequency = models.CharField(max_length=140, blank=True, null=True, default='Monthly')
    is_default = models.CharField(max_length=140, blank=True, null=True, default='No')
    salary_slip_based_on_timesheet = models.SmallIntegerField(default=0)
    salary_component = models.CharField(max_length=140, blank=True, null=True, default='')
    hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    leave_encashment_amount_per_day = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_benefits = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_earning = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_deduction = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_pay = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_account = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
