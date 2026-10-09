from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DataImportSkippedRowGenerated(FrappeChildModel):
    doctype = 'Data Import Skipped Row'
    row_number = models.IntegerField(null=True, blank=True)
    row_data = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
