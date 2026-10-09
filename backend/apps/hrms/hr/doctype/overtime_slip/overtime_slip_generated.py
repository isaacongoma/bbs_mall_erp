from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OvertimeSlipGenerated(FrappeModel):
    doctype = 'Overtime Slip'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_overtime_duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    salary_slip = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    payroll_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    submitted_via_payroll_entry = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
