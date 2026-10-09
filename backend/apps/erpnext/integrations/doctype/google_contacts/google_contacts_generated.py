from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GoogleContactsGenerated(FrappeModel):
    doctype = 'Google Contacts'
    enable = models.SmallIntegerField(default=0)
    authorization_code = models.TextField(blank=True, null=True, default='')
    refresh_token = models.TextField(blank=True, null=True, default='')
    last_sync_on = FrappeDateTimeField(null=True, blank=True)
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    next_sync_token = models.TextField(blank=True, null=True, default='')
    pull_from_google_contacts = models.SmallIntegerField(default=0)
    push_to_google_contacts = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
