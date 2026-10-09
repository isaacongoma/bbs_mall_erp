from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NotificationTypeGenerated(FrappeModel):
    doctype = 'Notification Type'
    type_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
