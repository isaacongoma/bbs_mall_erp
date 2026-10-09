from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesInvoiceAdvanceGenerated(FrappeChildModel):
    doctype = 'Sales Invoice Advance'
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    reference_row = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ref_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    difference_posting_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
