from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class KenyaSalesReconciliationFileGenerated(FrappeChildModel):
    doctype = 'Kenya Sales Reconciliation File'
    file_url = models.CharField(max_length=140, blank=True, null=True, default='')
    file_name = models.CharField(max_length=140, blank=True, null=True, default='')
    file_size = models.IntegerField(null=True, blank=True)
    row_count = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
