from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DeliveryZoneGenerated(FrappeModel):
    doctype = 'Delivery Zone'
    zone_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    free_delivery_above = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    b2b_only = models.SmallIntegerField(default=0)
    is_pickup_only = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
