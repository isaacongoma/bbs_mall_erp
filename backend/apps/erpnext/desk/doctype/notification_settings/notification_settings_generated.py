from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NotificationSettingsGenerated(FrappeModel):
    doctype = 'Notification Settings'
    enabled = models.SmallIntegerField(default=1)
    enable_email_notifications = models.SmallIntegerField(default=1)
    enable_email_mention = models.SmallIntegerField(default=1)
    enable_email_assignment = models.SmallIntegerField(default=1)
    enable_email_share = models.SmallIntegerField(default=1)
    seen = models.SmallIntegerField(default=0)
    enable_email_event_reminders = models.SmallIntegerField(default=1)
    enable_email_threads_on_assigned_document = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
