from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class IssueTypeGenerated(FrappeModel):
    doctype = 'Issue Type'
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
