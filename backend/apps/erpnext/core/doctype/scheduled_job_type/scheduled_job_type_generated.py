from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ScheduledJobTypeGenerated(FrappeModel):
    doctype = 'Scheduled Job Type'
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    stopped = models.SmallIntegerField(default=0)
    create_log = models.SmallIntegerField(default=0)
    last_execution = models.DateTimeField(null=True, blank=True)
    cron_format = models.CharField(max_length=140, blank=True, null=True, default='')
    queue = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    server_script = models.CharField(max_length=140, blank=True, null=True, default='')
    next_execution = models.DateTimeField(null=True, blank=True)
    scheduler_event = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
