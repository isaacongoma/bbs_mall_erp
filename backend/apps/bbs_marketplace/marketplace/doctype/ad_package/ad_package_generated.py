from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AdPackageGenerated(FrappeModel):
    doctype = 'Ad Package'
    package_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    placement = models.CharField(max_length=140, blank=True, null=True, default='Search Boost')
    price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    duration_days = models.IntegerField(null=True, blank=True)
    max_listings = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
