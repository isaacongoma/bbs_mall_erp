from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentReconciliationPaymentGenerated(FrappeChildModel):
    doctype = 'Payment Reconciliation Payment'
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    is_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_row = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    difference_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
