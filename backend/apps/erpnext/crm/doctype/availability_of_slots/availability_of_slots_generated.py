from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AvailabilityOfSlotsGenerated(FrappeChildModel):
    doctype = 'Availability Of Slots'
    day_of_week = models.CharField(max_length=140, blank=True, null=True, default='')
    from_time = FrappeTimeField(null=True, blank=True)
    to_time = FrappeTimeField(null=True, blank=True)

    class Meta:
        abstract = True
