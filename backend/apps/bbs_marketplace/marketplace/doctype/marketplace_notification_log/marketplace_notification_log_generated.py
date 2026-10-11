from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceNotificationLogGenerated(FrappeModel):
    doctype = 'Marketplace Notification Log'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='NTF-.YYYY.-')
    event_name = models.CharField(max_length=140, blank=True, null=True, default='')
    audience = models.CharField(max_length=140, blank=True, null=True, default='')
    channel = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    recipient = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    sent_on = FrappeDateTimeField(null=True, blank=True)
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='')
    error = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
