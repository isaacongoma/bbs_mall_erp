from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityGoalObjectiveGenerated(FrappeChildModel):
    doctype = 'Quality Goal Objective'
    objective = models.TextField(blank=True, null=True, default='')
    target = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
