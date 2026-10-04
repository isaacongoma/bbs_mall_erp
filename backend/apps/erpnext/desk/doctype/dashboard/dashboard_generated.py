from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DashboardGenerated(FrappeModel):
    doctype = 'Dashboard'
    dashboard_name = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    chart_options = models.TextField(blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
