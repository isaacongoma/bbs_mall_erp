from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingPriceTierGenerated(FrappeChildModel):
    doctype = 'Listing Price Tier'
    min_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='B2B')

    class Meta:
        abstract = True
