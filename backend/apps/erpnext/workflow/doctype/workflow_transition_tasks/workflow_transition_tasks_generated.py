from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkflowTransitionTasksGenerated(FrappeModel):
    doctype = 'Workflow Transition Tasks'

    class Meta:
        abstract = True
