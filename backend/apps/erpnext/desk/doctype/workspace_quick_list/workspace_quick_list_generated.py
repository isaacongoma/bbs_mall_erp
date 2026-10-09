from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkspaceQuickListGenerated(FrappeChildModel):
    doctype = 'Workspace Quick List'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    quick_list_filter = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
