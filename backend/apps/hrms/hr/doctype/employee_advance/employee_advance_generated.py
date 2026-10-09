from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeAdvanceGenerated(FrappeModel):
    doctype = 'Employee Advance'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    purpose = models.TextField(blank=True, null=True, default='')
    advance_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    claimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_account = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    return_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    repay_unclaimed_amount_from_salary = models.SmallIntegerField(default=0)
    pending_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    base_paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
