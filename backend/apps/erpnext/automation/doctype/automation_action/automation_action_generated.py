from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AutomationActionGenerated(FrappeChildModel):
    doctype = 'Automation Action'
    step_key = models.CharField(max_length=140, blank=True, null=True, default='')
    step_type = models.CharField(max_length=140, blank=True, null=True, default='Action')
    action_type = models.CharField(max_length=140, blank=True, null=True, default='')
    target = models.CharField(max_length=140, blank=True, null=True, default='trigger')
    output_alias = models.CharField(max_length=140, blank=True, null=True, default='')
    params = models.TextField(blank=True, null=True, default='')
    step_condition = models.TextField(blank=True, null=True, default='')
    related_condition = models.TextField(blank=True, null=True, default='')
    parent_step = models.IntegerField(null=True, blank=True)
    branch = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
