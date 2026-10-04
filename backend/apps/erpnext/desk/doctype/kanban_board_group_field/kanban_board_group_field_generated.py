from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class KanbanBoardGroupFieldGenerated(FrappeChildModel):
    doctype = 'Kanban Board Group Field'
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
