from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RecentlyViewedProductGenerated(FrappeModel):
    doctype = 'Recently Viewed Product'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    viewed_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
