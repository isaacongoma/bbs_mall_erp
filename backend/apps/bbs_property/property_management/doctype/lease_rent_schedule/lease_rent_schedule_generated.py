from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseRentScheduleGenerated(FrappeChildModel):
    doctype = 'Lease Rent Schedule'
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    monthly_rent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    monthly_service_charge = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    note = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
