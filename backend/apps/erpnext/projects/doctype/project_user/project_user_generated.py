from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProjectUserGenerated(FrappeChildModel):
    doctype = 'Project User'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    welcome_email_sent = models.SmallIntegerField(default=0)
    view_attachments = models.SmallIntegerField(default=0)
    hide_timesheets = models.SmallIntegerField(default=0)
    project_status = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
