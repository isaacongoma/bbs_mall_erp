from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PermissionLogGenerated(FrappeModel):
    doctype = 'Permission Log'
    changed_by = models.CharField(max_length=140, blank=True, null=True, default='')
    changed_at = FrappeDateTimeField(null=True, blank=True)
    changes = models.TextField(blank=True, null=True, default='')
    for_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    for_document = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
