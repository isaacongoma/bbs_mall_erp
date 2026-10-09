from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UnhandledEmailGenerated(FrappeModel):
    doctype = 'Unhandled Email'
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    uid = models.CharField(max_length=140, blank=True, null=True, default='')
    reason = models.TextField(blank=True, null=True, default='')
    message_id = models.TextField(blank=True, null=True, default='')
    raw = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
