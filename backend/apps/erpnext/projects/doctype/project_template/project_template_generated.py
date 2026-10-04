from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProjectTemplateGenerated(FrappeModel):
    doctype = 'Project Template'
    project_type = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
