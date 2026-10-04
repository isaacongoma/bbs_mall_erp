from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkflowTransitionGenerated(FrappeChildModel):
    doctype = 'Workflow Transition'
    state = models.CharField(max_length=140, blank=True, null=True, default='')
    action = models.CharField(max_length=140, blank=True, null=True, default='')
    next_state = models.CharField(max_length=140, blank=True, null=True, default='')
    allowed = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_self_approval = models.SmallIntegerField(default=1)
    condition = models.TextField(blank=True, null=True, default='')
    workflow_builder_id = models.CharField(max_length=140, blank=True, null=True, default='')
    send_email_to_creator = models.SmallIntegerField(default=0)
    transition_tasks = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
