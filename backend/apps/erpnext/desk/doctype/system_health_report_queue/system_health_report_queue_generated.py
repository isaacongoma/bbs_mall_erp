from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SystemHealthReportQueueGenerated(FrappeChildModel):
    doctype = 'System Health Report Queue'
    queue = models.CharField(max_length=140, blank=True, null=True, default='')
    pending_jobs = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
