from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentEntryDeductionGenerated(FrappeChildModel):
    doctype = 'Payment Entry Deduction'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    is_exchange_gain_loss = models.SmallIntegerField(default=0)
    dunning = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
