from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProjectTemplateTaskGenerated(FrappeChildModel):
    doctype = 'Project Template Task'
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
