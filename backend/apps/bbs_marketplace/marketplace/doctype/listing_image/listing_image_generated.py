from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingImageGenerated(FrappeChildModel):
    doctype = 'Listing Image'
    image = models.TextField(blank=True, null=True, default='')
    alt_text = models.CharField(max_length=140, blank=True, null=True, default='')
    is_primary = models.SmallIntegerField(default=0)
    sort_order = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
