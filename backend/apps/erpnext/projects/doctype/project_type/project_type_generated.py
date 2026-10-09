from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProjectTypeGenerated(FrappeModel):
    doctype = 'Project Type'
    project_type = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
