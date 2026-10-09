from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class KanbanBoardColumnGenerated(FrappeChildModel):
    doctype = 'Kanban Board Column'
    column_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Active')
    indicator = models.CharField(max_length=140, blank=True, null=True, default='Gray')
    order = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
