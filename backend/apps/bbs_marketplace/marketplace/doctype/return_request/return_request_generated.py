from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ReturnRequestGenerated(FrappeModel):
    doctype = 'Return Request'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='RMA-.YYYY.-')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    seller_order = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Requested')
    reason = models.CharField(max_length=140, blank=True, null=True, default='')
    resolution = models.CharField(max_length=140, blank=True, null=True, default='Refund')
    seller_liable = models.SmallIntegerField(default=0)
    details = models.TextField(blank=True, null=True, default='')
    evidence = models.TextField(blank=True, null=True, default='')
    refund_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    refund_method = models.CharField(max_length=140, blank=True, null=True, default='')
    refund_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    reverse_journal = models.CharField(max_length=140, blank=True, null=True, default='')
    refund_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    credit_note = models.CharField(max_length=140, blank=True, null=True, default='')
    decision_note = models.TextField(blank=True, null=True, default='')
    decided_by = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
