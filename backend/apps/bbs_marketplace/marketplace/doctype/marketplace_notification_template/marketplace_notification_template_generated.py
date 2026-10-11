from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceNotificationTemplateGenerated(FrappeModel):
    doctype = 'Marketplace Notification Template'
    event_name = models.CharField(max_length=140, blank=True, null=True, default='')
    audience = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    send_email = models.SmallIntegerField(default=1)
    send_sms = models.SmallIntegerField(default=1)
    email_subject = models.CharField(max_length=140, blank=True, null=True, default='')
    email_body = models.TextField(blank=True, null=True, default='')
    sms_body = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
