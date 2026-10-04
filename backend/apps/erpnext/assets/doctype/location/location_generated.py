from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LocationGenerated(FrappeTreeModel):
    doctype = 'Location'
    location_name = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_location = models.CharField(max_length=140, blank=True, null=True, default='')
    is_container = models.SmallIntegerField(default=0)
    is_group = models.SmallIntegerField(default=0)
    latitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    area = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    area_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.TextField(blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
