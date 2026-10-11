from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceSizeChartGenerated(FrappeModel):
    doctype = 'Marketplace Size Chart'
    chart_name = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    unit = models.CharField(max_length=140, blank=True, null=True, default='cm')
    notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
