from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailQueueRecipientGenerated(FrappeChildModel):
    doctype = 'Email Queue Recipient'
    recipient = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Not Sent')
    error = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
