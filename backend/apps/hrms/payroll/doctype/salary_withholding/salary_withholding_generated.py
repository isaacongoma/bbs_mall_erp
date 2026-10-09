from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalaryWithholdingGenerated(FrappeModel):
    doctype = 'Salary Withholding'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    payroll_frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    number_of_withholding_cycles = models.IntegerField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    date_of_joining = models.DateField(null=True, blank=True)
    relieving_date = models.DateField(null=True, blank=True)
    reason_for_withholding_salary = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')

    class Meta:
        abstract = True
