from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkstationTypeGenerated(FrappeModel):
    doctype = 'Workstation Type'
    workstation_type = models.CharField(max_length=140, blank=True, null=True, default='')
    hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
