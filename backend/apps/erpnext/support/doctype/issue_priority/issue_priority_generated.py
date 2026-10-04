from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class IssuePriorityGenerated(FrappeModel):
    doctype = 'Issue Priority'
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
