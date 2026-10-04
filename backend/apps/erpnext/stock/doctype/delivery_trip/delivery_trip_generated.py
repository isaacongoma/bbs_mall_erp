from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DeliveryTripGenerated(FrappeModel):
    doctype = 'Delivery Trip'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    email_notification_sent = models.SmallIntegerField(default=0)
    driver = models.CharField(max_length=140, blank=True, null=True, default='')
    driver_name = models.CharField(max_length=140, blank=True, null=True, default='')
    total_distance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    vehicle = models.CharField(max_length=140, blank=True, null=True, default='')
    departure_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    driver_address = models.CharField(max_length=140, blank=True, null=True, default='')
    driver_email = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
