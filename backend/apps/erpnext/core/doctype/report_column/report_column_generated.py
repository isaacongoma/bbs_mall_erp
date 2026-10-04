from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ReportColumnGenerated(FrappeChildModel):
    doctype = 'Report Column'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    options = models.CharField(max_length=140, blank=True, null=True, default='')
    width = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
