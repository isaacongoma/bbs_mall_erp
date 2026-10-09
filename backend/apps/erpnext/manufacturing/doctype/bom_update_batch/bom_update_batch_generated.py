from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomUpdateBatchGenerated(FrappeChildModel):
    doctype = 'BOM Update Batch'
    level = models.IntegerField(null=True, blank=True)
    batch_no = models.IntegerField(null=True, blank=True)
    boms_updated = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
