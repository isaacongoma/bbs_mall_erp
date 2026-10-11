from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SizeChartRowGenerated(FrappeChildModel):
    doctype = 'Size Chart Row'
    size_label = models.CharField(max_length=140, blank=True, null=True, default='')
    measurements = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
