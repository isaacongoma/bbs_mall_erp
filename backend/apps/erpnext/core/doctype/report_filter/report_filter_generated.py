from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ReportFilterGenerated(FrappeChildModel):
    doctype = 'Report Filter'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    mandatory = models.SmallIntegerField(default=0)
    options = models.TextField(blank=True, null=True, default='')
    wildcard_filter = models.SmallIntegerField(default=0)
    default = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
