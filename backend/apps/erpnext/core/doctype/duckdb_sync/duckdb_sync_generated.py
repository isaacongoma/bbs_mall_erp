from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DuckdbSyncGenerated(FrappeModel):
    doctype = 'DuckDB Sync'
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    filename = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
