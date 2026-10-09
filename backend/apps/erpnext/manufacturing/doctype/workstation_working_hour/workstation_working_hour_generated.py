from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkstationWorkingHourGenerated(FrappeChildModel):
    doctype = 'Workstation Working Hour'
    start_time = FrappeTimeField(null=True, blank=True)
    end_time = FrappeTimeField(null=True, blank=True)
    enabled = models.SmallIntegerField(default=1)
    hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
