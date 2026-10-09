from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ServerScriptGenerated(FrappeModel):
    doctype = 'Server Script'
    script_type = models.CharField(max_length=140, blank=True, null=True, default='')
    script = models.TextField(blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    doctype_event = models.CharField(max_length=140, blank=True, null=True, default='')
    api_method = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_guest = models.SmallIntegerField(default=0)
    disabled = models.SmallIntegerField(default=0)
    event_frequency = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    enable_rate_limit = models.SmallIntegerField(default=0)
    rate_limit_count = models.IntegerField(null=True, blank=True)
    rate_limit_seconds = models.IntegerField(null=True, blank=True)
    cron_format = models.CharField(max_length=140, blank=True, null=True, default='')
    queue = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
