from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TaskDependsOnGenerated(FrappeChildModel):
    doctype = 'Task Depends On'
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.TextField(blank=True, null=True, default='')
    project = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
