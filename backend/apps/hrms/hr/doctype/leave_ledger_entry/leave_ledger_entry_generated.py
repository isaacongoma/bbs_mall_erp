from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveLedgerEntryGenerated(FrappeModel):
    doctype = 'Leave Ledger Entry'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_name = models.CharField(max_length=140, blank=True, null=True, default='')
    leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    is_carry_forward = models.SmallIntegerField(default=0)
    is_expired = models.SmallIntegerField(default=0)
    is_lwp = models.SmallIntegerField(default=0)
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
