from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkflowActionMasterGenerated(FrappeModel):
    doctype = 'Workflow Action Master'
    workflow_action_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
