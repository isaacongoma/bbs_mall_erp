from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceWishlistItemGenerated(FrappeModel):
    doctype = 'Marketplace Wishlist Item'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    added_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
