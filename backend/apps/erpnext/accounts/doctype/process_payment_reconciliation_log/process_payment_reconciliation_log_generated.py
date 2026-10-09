from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessPaymentReconciliationLogGenerated(FrappeModel):
    doctype = 'Process Payment Reconciliation Log'
    reconciled = models.SmallIntegerField(default=0)
    total_allocations = models.IntegerField(null=True, blank=True)
    allocated = models.SmallIntegerField(default=0)
    reconciled_entries = models.IntegerField(null=True, blank=True)
    error_log = models.TextField(blank=True, null=True, default='')
    process_pr = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
