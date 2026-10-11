from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceBannerGenerated(FrappeModel):
    doctype = 'Marketplace Banner'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    placement = models.CharField(max_length=140, blank=True, null=True, default='Home Hero')
    image = models.TextField(blank=True, null=True, default='')
    mobile_image = models.TextField(blank=True, null=True, default='')
    link_type = models.CharField(max_length=140, blank=True, null=True, default='None')
    link_value = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = FrappeDateTimeField(null=True, blank=True)
    end_date = FrappeDateTimeField(null=True, blank=True)
    sort_order = models.IntegerField(null=True, blank=True)
    enabled = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
