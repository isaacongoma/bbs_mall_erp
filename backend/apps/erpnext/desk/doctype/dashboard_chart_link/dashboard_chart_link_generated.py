from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DashboardChartLinkGenerated(FrappeChildModel):
    doctype = 'Dashboard Chart Link'
    chart = models.CharField(max_length=140, blank=True, null=True, default='')
    width = models.CharField(max_length=140, blank=True, null=True, default='Half')

    class Meta:
        abstract = True
