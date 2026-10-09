from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DowntimeEntryGenerated(FrappeModel):
    doctype = 'Downtime Entry'
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    from_time = FrappeDateTimeField(null=True, blank=True)
    to_time = FrappeDateTimeField(null=True, blank=True)
    operator = models.CharField(max_length=140, blank=True, null=True, default='')
    downtime = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stop_reason = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
