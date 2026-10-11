from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PickupStationGenerated(FrappeModel):
    doctype = 'Pickup Station'
    station_name = models.CharField(max_length=140, blank=True, null=True, default='')
    courier = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    county = models.CharField(max_length=140, blank=True, null=True, default='')
    zone = models.CharField(max_length=140, blank=True, null=True, default='')
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    address = models.TextField(blank=True, null=True, default='')
    opening_hours = models.CharField(max_length=140, blank=True, null=True, default='')
    latitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
