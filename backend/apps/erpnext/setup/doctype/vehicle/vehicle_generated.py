from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VehicleGenerated(FrappeModel):
    doctype = 'Vehicle'
    license_plate = models.CharField(max_length=140, blank=True, null=True, default='')
    make = models.CharField(max_length=140, blank=True, null=True, default='')
    model = models.CharField(max_length=140, blank=True, null=True, default='')
    last_odometer = models.IntegerField(null=True, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    chassis_no = models.CharField(max_length=140, blank=True, null=True, default='')
    vehicle_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    insurance_company = models.CharField(max_length=140, blank=True, null=True, default='')
    policy_no = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    fuel_type = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    carbon_check_date = models.DateField(null=True, blank=True)
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    wheels = models.IntegerField(null=True, blank=True)
    doors = models.IntegerField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
