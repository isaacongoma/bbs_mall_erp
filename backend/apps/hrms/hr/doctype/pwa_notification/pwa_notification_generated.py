from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PwaNotificationGenerated(FrappeModel):
    doctype = 'PWA Notification'
    from_user = models.CharField(max_length=140, blank=True, null=True, default='')
    to_user = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='')
    read = models.SmallIntegerField(default=0)
    reference_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
