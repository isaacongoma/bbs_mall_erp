from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EventNotificationsGenerated(FrappeChildModel):
    doctype = 'Event Notifications'
    type = models.CharField(max_length=140, blank=True, null=True, default='Notification')
    before = models.IntegerField(null=True, blank=True)
    interval = models.CharField(max_length=140, blank=True, null=True, default='')
    time = FrappeTimeField(null=True, blank=True)

    class Meta:
        abstract = True
