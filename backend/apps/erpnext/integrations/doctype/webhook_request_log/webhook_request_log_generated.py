from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebhookRequestLogGenerated(FrappeModel):
    doctype = 'Webhook Request Log'
    url = models.TextField(blank=True, null=True, default='')
    headers = models.TextField(blank=True, null=True, default='')
    response = models.TextField(blank=True, null=True, default='')
    data = models.TextField(blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    error = models.TextField(blank=True, null=True, default='')
    webhook = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    attempt = models.IntegerField(null=True, blank=True)
    next_retry = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
