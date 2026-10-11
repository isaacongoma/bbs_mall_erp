from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceFaqGenerated(FrappeModel):
    doctype = 'Marketplace FAQ'
    question = models.CharField(max_length=140, blank=True, null=True, default='')
    category = models.CharField(max_length=140, blank=True, null=True, default='General')
    published = models.SmallIntegerField(default=1)
    sort_order = models.IntegerField(null=True, blank=True)
    answer = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
