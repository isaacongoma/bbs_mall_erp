from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DriverGenerated(FrappeModel):
    doctype = 'Driver'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    transporter = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    cell_number = models.CharField(max_length=140, blank=True, null=True, default='')
    license_number = models.CharField(max_length=140, blank=True, null=True, default='')
    issuing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    address = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
