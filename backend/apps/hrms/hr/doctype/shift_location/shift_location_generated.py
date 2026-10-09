from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShiftLocationGenerated(FrappeModel):
    doctype = 'Shift Location'
    location_name = models.CharField(max_length=140, blank=True, null=True, default='')
    checkin_radius = models.IntegerField(null=True, blank=True)
    longitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    geolocation = models.TextField(blank=True, null=True, default='')
    latitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
