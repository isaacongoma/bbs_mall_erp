from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShipmentDeliveryNoteGenerated(FrappeChildModel):
    doctype = 'Shipment Delivery Note'
    delivery_note = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
