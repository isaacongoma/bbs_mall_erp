from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MilestoneTrackerGenerated(FrappeModel):
    doctype = 'Milestone Tracker'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    track_field = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
