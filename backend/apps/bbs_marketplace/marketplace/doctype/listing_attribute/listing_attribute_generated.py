from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingAttributeGenerated(FrappeChildModel):
    doctype = 'Listing Attribute'
    attribute = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=140, blank=True, null=True, default='')
    filterable = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
