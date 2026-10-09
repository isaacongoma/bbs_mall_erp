from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankTransactionPaymentsGenerated(FrappeChildModel):
    doctype = 'Bank Transaction Payments'
    payment_document = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    clearance_date = models.DateField(null=True, blank=True)
    reconciliation_type = models.CharField(max_length=140, blank=True, null=True, default='Matched')

    class Meta:
        abstract = True
