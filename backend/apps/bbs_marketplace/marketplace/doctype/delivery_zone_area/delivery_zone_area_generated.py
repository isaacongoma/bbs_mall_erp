from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DeliveryZoneAreaGenerated(FrappeChildModel):
    doctype = 'Delivery Zone Area'
    county = models.CharField(max_length=140, blank=True, null=True, default='')
    town = models.CharField(max_length=140, blank=True, null=True, default='')
    territory = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
