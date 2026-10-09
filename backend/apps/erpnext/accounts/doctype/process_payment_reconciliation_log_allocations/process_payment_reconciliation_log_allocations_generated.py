from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessPaymentReconciliationLogAllocationsGenerated(FrappeChildModel):
    doctype = 'Process Payment Reconciliation Log Allocations'
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_row = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    unreconciled_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    difference_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    difference_account = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    reconciled = models.SmallIntegerField(default=0)
    gain_loss_posting_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
