from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DiscountedInvoiceGenerated(FrappeChildModel):
    doctype = 'Discounted Invoice'
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    debit_to = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
