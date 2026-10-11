from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplacePaymentMethodGenerated(FrappeChildModel):
    doctype = 'Marketplace Payment Method'
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    audience = models.CharField(max_length=140, blank=True, null=True, default='Both')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    clearing_account = models.CharField(max_length=140, blank=True, null=True, default='')
    fee_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fee_flat = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    min_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
