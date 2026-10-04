from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class NotificationRecipientGenerated(FrappeChildModel):
    doctype = 'Notification Recipient'
    cc = models.TextField(blank=True, null=True, default='')
    bcc = models.TextField(blank=True, null=True, default='')
    condition = models.CharField(max_length=140, blank=True, null=True, default='')
    receiver_by_document_field = models.CharField(max_length=140, blank=True, null=True, default='')
    receiver_by_role = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
