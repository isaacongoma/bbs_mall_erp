from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DeliveryStopGenerated(FrappeChildModel):
    doctype = 'Delivery Stop'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    address = models.CharField(max_length=140, blank=True, null=True, default='')
    locked = models.SmallIntegerField(default=0)
    customer_address = models.TextField(blank=True, null=True, default='')
    visited = models.SmallIntegerField(default=0)
    delivery_note = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    contact = models.CharField(max_length=140, blank=True, null=True, default='')
    email_sent_to = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_contact = models.TextField(blank=True, null=True, default='')
    distance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    estimated_arrival = models.DateTimeField(null=True, blank=True)
    lat = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    lng = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    details = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
