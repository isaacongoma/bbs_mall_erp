from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveEncashmentGenerated(FrappeModel):
    doctype = 'Leave Encashment'
    leave_period = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_allocation = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    encashment_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    encashment_date = models.DateField(null=True, blank=True)
    additional_salary = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    encashment_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_encashable_days = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    pay_via_payment_entry = models.SmallIntegerField(default=0)
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
