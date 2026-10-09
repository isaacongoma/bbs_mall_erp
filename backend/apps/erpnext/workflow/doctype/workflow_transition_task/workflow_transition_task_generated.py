from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkflowTransitionTaskGenerated(FrappeChildModel):
    doctype = 'Workflow Transition Task'
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    link = models.CharField(max_length=140, blank=True, null=True, default='')
    asynchronous = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
