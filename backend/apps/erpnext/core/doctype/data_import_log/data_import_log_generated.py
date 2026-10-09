from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DataImportLogGenerated(FrappeModel):
    doctype = 'Data Import Log'
    data_import = models.CharField(max_length=140, blank=True, null=True, default='')
    docname = models.CharField(max_length=140, blank=True, null=True, default='')
    exception = models.TextField(blank=True, null=True, default='')
    row_indexes = models.TextField(blank=True, null=True, default='')
    success = models.SmallIntegerField(default=0)
    import_action = models.CharField(max_length=140, blank=True, null=True, default='')
    log_index = models.IntegerField(null=True, blank=True)
    messages = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
