from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UserSessionDisplayGenerated(FrappeChildModel):
    doctype = 'User Session Display'
    id = models.CharField(max_length=140, blank=True, null=True, default='')
    ip_address = models.CharField(max_length=140, blank=True, null=True, default='')
    session_created = FrappeDateTimeField(null=True, blank=True)
    last_updated = FrappeDateTimeField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True, default='')
    is_current = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
