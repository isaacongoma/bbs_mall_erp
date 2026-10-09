from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkflowActionGenerated(FrappeModel):
    doctype = 'Workflow Action'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    workflow_state = models.CharField(max_length=140, blank=True, null=True, default='')
    completed_by = models.CharField(max_length=140, blank=True, null=True, default='')
    completed_by_role = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
