from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class VoiceCallSettingsGenerated(FrappeModel):
    doctype = 'Voice Call Settings'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    greeting_message = models.CharField(max_length=140, blank=True, null=True, default='')
    agent_busy_message = models.CharField(max_length=140, blank=True, null=True, default='')
    agent_unavailable_message = models.CharField(max_length=140, blank=True, null=True, default='')
    call_receiving_device = models.CharField(max_length=140, blank=True, null=True, default='Computer')

    class Meta:
        abstract = True
