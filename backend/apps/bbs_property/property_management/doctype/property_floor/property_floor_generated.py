from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PropertyFloorGenerated(FrappeModel):
    doctype = 'Property Floor'
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    floor_name = models.CharField(max_length=140, blank=True, null=True, default='')
    level = models.IntegerField(null=True, blank=True)
    area_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    floor_plan = models.TextField(blank=True, null=True, default='')
    notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
