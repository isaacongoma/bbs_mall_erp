from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShipmentParcelGenerated(FrappeChildModel):
    doctype = 'Shipment Parcel'
    length = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    count = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
