from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemAlternativeGenerated(FrappeModel):
    doctype = 'Item Alternative'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    alternative_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    two_way = models.SmallIntegerField(default=0)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    alternative_item_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
