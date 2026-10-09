from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SchedulerEventGenerated(FrappeModel):
    doctype = 'Scheduler Event'
    scheduled_against = models.CharField(max_length=140, blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
