from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UtilityMeterGenerated(FrappeModel):
    doctype = 'Utility Meter'
    meter_number = models.CharField(max_length=140, blank=True, null=True, default='')
    utility_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Active')
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    unit = models.CharField(max_length=140, blank=True, null=True, default='')
    tariff = models.CharField(max_length=140, blank=True, null=True, default='')
    initial_reading = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    multiplier = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    installed_on = models.DateField(null=True, blank=True)
    last_reading = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    last_reading_date = models.DateField(null=True, blank=True)
    current_customer = models.CharField(max_length=140, blank=True, null=True, default='')
    location_notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
