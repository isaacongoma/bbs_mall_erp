from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShipmentEventGenerated(FrappeChildModel):
    doctype = 'Shipment Event'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    at = FrappeDateTimeField(null=True, blank=True)
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    note = models.TextField(blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='System')

    class Meta:
        abstract = True
