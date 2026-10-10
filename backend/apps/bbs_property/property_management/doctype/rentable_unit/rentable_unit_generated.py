from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RentableUnitGenerated(FrappeModel):
    doctype = 'Rentable Unit'
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    floor = models.CharField(max_length=140, blank=True, null=True, default='')
    unit_code = models.CharField(max_length=140, blank=True, null=True, default='')
    unit_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Vacant')
    unit_type = models.CharField(max_length=140, blank=True, null=True, default='Retail Shop')
    category = models.CharField(max_length=140, blank=True, null=True, default='')
    area_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate_per_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    service_charge_per_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    service_charge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_lease = models.CharField(max_length=140, blank=True, null=True, default='')
    current_tenant = models.CharField(max_length=140, blank=True, null=True, default='')
    lease_expiry = models.DateField(null=True, blank=True)
    vacant_since = models.DateField(null=True, blank=True)
    features = models.TextField(blank=True, null=True, default='')
    frontage_m = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    photo = models.TextField(blank=True, null=True, default='')
    plan_x = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    plan_y = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    plan_width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    plan_height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
