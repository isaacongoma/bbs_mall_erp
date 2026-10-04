from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkspaceNumberCardGenerated(FrappeChildModel):
    doctype = 'Workspace Number Card'
    number_card_name = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
