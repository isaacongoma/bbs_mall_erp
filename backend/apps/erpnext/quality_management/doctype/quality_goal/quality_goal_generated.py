from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class QualityGoalGenerated(FrappeModel):
    doctype = 'Quality Goal'
    frequency = models.CharField(max_length=140, blank=True, null=True, default='None')
    procedure = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.CharField(max_length=140, blank=True, null=True, default='')
    weekday = models.CharField(max_length=140, blank=True, null=True, default='')
    goal = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
