from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceVoucherRedemptionGenerated(FrappeModel):
    doctype = 'Marketplace Voucher Redemption'
    voucher = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Applied')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    shipping_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    redeemed_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
