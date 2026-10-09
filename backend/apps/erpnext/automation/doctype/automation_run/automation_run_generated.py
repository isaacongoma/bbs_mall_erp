from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationRunGenerated(FrappeModel):
    doctype = 'Automation Run'
    automation = models.CharField(max_length=140, blank=True, null=True, default='')
    automation_title = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    depth = models.IntegerField(null=True, blank=True)
    queue_row = models.CharField(max_length=140, blank=True, null=True, default='')
    started_at = FrappeDateTimeField(null=True, blank=True)
    ended_at = FrappeDateTimeField(null=True, blank=True)
    error_summary = models.TextField(blank=True, null=True, default='')
    actions_snapshot = models.TextField(blank=True, null=True, default='')
    relationships = models.TextField(blank=True, null=True, default='')
    run_state = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
