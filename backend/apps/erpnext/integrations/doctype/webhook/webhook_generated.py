from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebhookGenerated(FrappeModel):
    doctype = 'Webhook'
    webhook_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    webhook_docevent = models.CharField(max_length=140, blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')
    request_url = models.TextField(blank=True, null=True, default='')
    request_structure = models.CharField(max_length=140, blank=True, null=True, default='')
    webhook_json = models.TextField(blank=True, null=True, default='')
    enable_security = models.SmallIntegerField(default=0)
    webhook_secret = models.TextField(blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    request_method = models.CharField(max_length=140, blank=True, null=True, default='POST')
    is_dynamic_url = models.SmallIntegerField(default=0)
    timeout = models.IntegerField(null=True, blank=True)
    max_retries = models.IntegerField(null=True, blank=True)
    background_jobs_queue = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
