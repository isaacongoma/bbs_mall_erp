from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SlackWebhookUrlGenerated(FrappeModel):
    doctype = 'Slack Webhook URL'
    webhook_name = models.CharField(max_length=140, blank=True, null=True, default='')
    webhook_url = models.CharField(max_length=140, blank=True, null=True, default='')
    show_document_link = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
