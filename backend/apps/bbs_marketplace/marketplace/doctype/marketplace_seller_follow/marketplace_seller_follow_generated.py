from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceSellerFollowGenerated(FrappeModel):
    doctype = 'Marketplace Seller Follow'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
