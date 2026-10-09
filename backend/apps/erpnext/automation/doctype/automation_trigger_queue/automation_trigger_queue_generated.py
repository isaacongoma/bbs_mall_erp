from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationTriggerQueueGenerated(FrappeModel):
    doctype = 'Automation Trigger Queue'
    automation = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    triggered_at = FrappeDateTimeField(null=True, blank=True)
    run_after = FrappeDateTimeField(null=True, blank=True)
    attempt = models.IntegerField(null=True, blank=True)
    depth = models.IntegerField(null=True, blank=True)
    triggered_by = models.CharField(max_length=140, blank=True, null=True, default='')
    event_payload = models.TextField(blank=True, null=True, default='')
    resume_run = models.CharField(max_length=140, blank=True, null=True, default='')
    resume_from_idx = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
