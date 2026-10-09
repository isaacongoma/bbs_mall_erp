from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GoogleCalendarGenerated(FrappeModel):
    doctype = 'Google Calendar'
    enable = models.SmallIntegerField(default=1)
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    calendar_name = models.CharField(max_length=140, blank=True, null=True, default='')
    refresh_token = models.TextField(blank=True, null=True, default='')
    authorization_code = models.TextField(blank=True, null=True, default='')
    next_sync_token = models.TextField(blank=True, null=True, default='')
    google_calendar_id = models.CharField(max_length=140, blank=True, null=True, default='')
    pull_from_google_calendar = models.SmallIntegerField(default=1)
    sync_as_public = models.SmallIntegerField(default=0)
    push_to_google_calendar = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
