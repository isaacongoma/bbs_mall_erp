from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class IncomingCallSettingsGenerated(FrappeModel):
    doctype = 'Incoming Call Settings'
    call_routing = models.CharField(max_length=140, blank=True, null=True, default='Sequential')
    greeting_message = models.CharField(max_length=140, blank=True, null=True, default='')
    agent_busy_message = models.CharField(max_length=140, blank=True, null=True, default='')
    agent_unavailable_message = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
