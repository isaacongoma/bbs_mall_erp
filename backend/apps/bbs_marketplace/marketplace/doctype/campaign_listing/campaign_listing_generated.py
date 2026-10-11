from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CampaignListingGenerated(FrappeChildModel):
    doctype = 'Campaign Listing'
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    discount_type = models.CharField(max_length=140, blank=True, null=True, default='Percent')
    discount_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_limit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sold_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    pricing_rule = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
