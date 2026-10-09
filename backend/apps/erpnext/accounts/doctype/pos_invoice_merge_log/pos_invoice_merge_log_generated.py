from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PosInvoiceMergeLogGenerated(FrappeModel):
    doctype = 'POS Invoice Merge Log'
    posting_date = models.DateField(null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    consolidated_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    consolidated_credit_note = models.CharField(max_length=140, blank=True, null=True, default='')
    pos_closing_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    merge_invoices_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_group = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_time = FrappeTimeField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
