from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomUpdateLogGenerated(FrappeModel):
    doctype = 'BOM Update Log'
    current_bom = models.CharField(max_length=140, blank=True, null=True, default='')
    new_bom = models.CharField(max_length=140, blank=True, null=True, default='')
    update_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    error_log = models.CharField(max_length=140, blank=True, null=True, default='')
    processed_boms = models.TextField(blank=True, null=True, default='')
    current_level = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
