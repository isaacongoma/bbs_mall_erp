from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VehicleServiceGenerated(FrappeChildModel):
    doctype = 'Vehicle Service'
    service_item = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
