from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationRunStepGenerated(FrappeChildModel):
    doctype = 'Automation Run Step'
    step_idx = models.IntegerField(null=True, blank=True)
    step_key = models.CharField(max_length=140, blank=True, null=True, default='')
    action_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    duration_ms = models.IntegerField(null=True, blank=True)
    detail = models.TextField(blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='')
    exception = models.CharField(max_length=140, blank=True, null=True, default='')
    traceback = models.TextField(blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')
    condition_values = models.TextField(blank=True, null=True, default='')
    output = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
