from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentReconciliationInvoiceGenerated(FrappeChildModel):
    doctype = 'Payment Reconciliation Invoice'
    invoice_type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
