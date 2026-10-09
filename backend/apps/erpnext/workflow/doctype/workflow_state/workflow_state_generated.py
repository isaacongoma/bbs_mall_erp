from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkflowStateGenerated(FrappeModel):
    doctype = 'Workflow State'
    workflow_state_name = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    style = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
