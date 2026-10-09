from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DashboardSettingsGenerated(FrappeModel):
    doctype = 'Dashboard Settings'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    chart_config = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
