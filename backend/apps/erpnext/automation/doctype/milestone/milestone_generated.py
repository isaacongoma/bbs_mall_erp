from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MilestoneGenerated(FrappeModel):
    doctype = 'Milestone'
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    track_field = models.CharField(max_length=140, blank=True, null=True, default='')
    value = models.CharField(max_length=140, blank=True, null=True, default='')
    milestone_tracker = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
