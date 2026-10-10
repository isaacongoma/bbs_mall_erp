from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseUnitGenerated(FrappeChildModel):
    doctype = 'Lease Unit'
    unit = models.CharField(max_length=140, blank=True, null=True, default='')
    unit_type = models.CharField(max_length=140, blank=True, null=True, default='')
    area_sqm = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    monthly_service_charge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
