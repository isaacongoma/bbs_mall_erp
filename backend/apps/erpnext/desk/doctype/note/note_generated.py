from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NoteGenerated(FrappeModel):
    doctype = 'Note'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    public = models.SmallIntegerField(default=0)
    notify_on_login = models.SmallIntegerField(default=0)
    notify_on_every_login = models.SmallIntegerField(default=0)
    expire_notification_on = FrappeDateTimeField(null=True, blank=True)
    content = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
