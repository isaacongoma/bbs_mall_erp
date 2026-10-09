from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DataImportValueMappingGenerated(FrappeChildModel):
    doctype = 'Data Import Value Mapping'
    column_label = models.CharField(max_length=140, blank=True, null=True, default='')
    source_value = models.CharField(max_length=140, blank=True, null=True, default='')
    no_of_rows = models.CharField(max_length=140, blank=True, null=True, default='')
    row_numbers = models.TextField(blank=True, null=True, default='')
    target_value = models.CharField(max_length=140, blank=True, null=True, default='')
    column = models.IntegerField(null=True, blank=True)
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_field = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldtype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    select_options = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
