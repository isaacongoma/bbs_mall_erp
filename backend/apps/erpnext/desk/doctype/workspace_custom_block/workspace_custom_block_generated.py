from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkspaceCustomBlockGenerated(FrappeChildModel):
    doctype = 'Workspace Custom Block'
    custom_block_name = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
