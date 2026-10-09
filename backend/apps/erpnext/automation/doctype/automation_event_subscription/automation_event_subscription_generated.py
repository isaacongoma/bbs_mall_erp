from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationEventSubscriptionGenerated(FrappeModel):
    doctype = 'Automation Event Subscription'
    event_name = models.CharField(max_length=140, blank=True, null=True, default='')
    correlation_key = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Waiting')
    expires_at = FrappeDateTimeField(null=True, blank=True)
    run = models.CharField(max_length=140, blank=True, null=True, default='')
    step_key = models.CharField(max_length=140, blank=True, null=True, default='')
    resume_queue = models.CharField(max_length=140, blank=True, null=True, default='')
    event_payload = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
