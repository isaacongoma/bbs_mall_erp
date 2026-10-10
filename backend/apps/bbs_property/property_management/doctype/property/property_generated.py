from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PropertyGenerated(FrappeModel):
    doctype = 'Property'
    property_name = models.CharField(max_length=140, blank=True, null=True, default='')
    abbr = models.CharField(max_length=10, blank=True, null=True, default='')
    property_type = models.CharField(max_length=140, blank=True, null=True, default='Shopping Mall')
    status = models.CharField(max_length=140, blank=True, null=True, default='Operational')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    manager = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    address_line = models.TextField(blank=True, null=True, default='')
    city = models.CharField(max_length=140, blank=True, null=True, default='')
    county = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='Kenya')
    latitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    gross_leasable_area = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_units = models.IntegerField(null=True, blank=True)
    occupied_units = models.IntegerField(null=True, blank=True)
    vacant_units = models.IntegerField(null=True, blank=True)
    occupancy_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    leased_area = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    rent_income_account = models.CharField(max_length=140, blank=True, null=True, default='')
    service_charge_account = models.CharField(max_length=140, blank=True, null=True, default='')
    security_deposit_account = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
