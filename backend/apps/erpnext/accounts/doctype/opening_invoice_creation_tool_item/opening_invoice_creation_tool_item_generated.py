from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OpeningInvoiceCreationToolItemGenerated(FrappeChildModel):
    doctype = 'Opening Invoice Creation Tool Item'
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    temporary_opening_account = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='Opening Invoice Item')
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    qty = models.CharField(max_length=140, blank=True, null=True, default='1')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_invoice_date = models.DateField(null=True, blank=True)
    party_name = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
