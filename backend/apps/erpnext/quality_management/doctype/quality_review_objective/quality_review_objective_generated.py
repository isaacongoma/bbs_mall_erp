from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityReviewObjectiveGenerated(FrappeChildModel):
    doctype = 'Quality Review Objective'
    objective = models.TextField(blank=True, null=True, default='')
    target = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    review = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')

    class Meta:
        abstract = True
