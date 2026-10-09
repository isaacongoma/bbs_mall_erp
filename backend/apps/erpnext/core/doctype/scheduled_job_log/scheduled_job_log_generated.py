from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ScheduledJobLogGenerated(FrappeModel):
    doctype = 'Scheduled Job Log'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    details = models.TextField(blank=True, null=True, default='')
    scheduled_job_type = models.CharField(max_length=140, blank=True, null=True, default='')
    debug_log = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
