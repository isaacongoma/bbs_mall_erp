from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DuckdbSyncItemGenerated(FrappeChildModel):
    doctype = 'DuckDB Sync Item'
    table = models.CharField(max_length=140, blank=True, null=True, default='')
    synced = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
