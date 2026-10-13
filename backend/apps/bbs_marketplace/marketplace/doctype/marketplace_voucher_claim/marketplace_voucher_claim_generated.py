from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceVoucherClaimGenerated(FrappeModel):
    doctype = 'Marketplace Voucher Claim'
    voucher = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    claimed_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
