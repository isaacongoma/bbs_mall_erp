from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WalletBillInvoiceGenerated(FrappeChildModel):
    doctype = 'Wallet Bill Invoice'
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    bill_type = models.CharField(max_length=140, blank=True, null=True, default='')
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
