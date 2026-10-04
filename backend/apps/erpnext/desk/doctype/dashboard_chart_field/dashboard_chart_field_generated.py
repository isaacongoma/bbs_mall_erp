from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DashboardChartFieldGenerated(FrappeChildModel):
    doctype = 'Dashboard Chart Field'
    y_field = models.CharField(max_length=140, blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
