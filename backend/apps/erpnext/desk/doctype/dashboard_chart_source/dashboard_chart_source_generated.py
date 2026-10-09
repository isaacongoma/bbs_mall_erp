from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DashboardChartSourceGenerated(FrappeModel):
    doctype = 'Dashboard Chart Source'
    source_name = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    timeseries = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
