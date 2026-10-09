from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PermissionTypeGenerated(FrappeModel):
    doctype = 'Permission Type'
    perm_type = models.CharField(max_length=140, blank=True, null=True, default='')
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
