from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingBundleItemGenerated(FrappeChildModel):
    doctype = 'Listing Bundle Item'
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
