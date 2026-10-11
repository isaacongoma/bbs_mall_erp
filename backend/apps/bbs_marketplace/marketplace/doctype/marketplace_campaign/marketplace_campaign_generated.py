from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceCampaignGenerated(FrappeModel):
    doctype = 'Marketplace Campaign'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    campaign_type = models.CharField(max_length=140, blank=True, null=True, default='Flash Sale')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    funded_by = models.CharField(max_length=140, blank=True, null=True, default='Seller')
    start_date = FrappeDateTimeField(null=True, blank=True)
    end_date = FrappeDateTimeField(null=True, blank=True)
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='Both')
    platform_share_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    banner = models.TextField(blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
