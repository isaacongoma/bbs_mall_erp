from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ReminderGenerated(FrappeModel):
    doctype = 'Reminder'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    reminder_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reminder_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    remind_at = FrappeDateTimeField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    notified = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
