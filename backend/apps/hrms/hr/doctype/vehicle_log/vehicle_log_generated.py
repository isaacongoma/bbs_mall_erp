from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VehicleLogGenerated(FrappeModel):
    doctype = 'Vehicle Log'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    license_plate = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    model = models.CharField(max_length=140, blank=True, null=True, default='')
    make = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    odometer = models.IntegerField(null=True, blank=True)
    fuel_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    last_odometer = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
