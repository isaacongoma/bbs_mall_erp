from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShipmentParcelTemplateGenerated(FrappeModel):
    doctype = 'Shipment Parcel Template'
    length = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    parcel_template_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
