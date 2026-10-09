from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SystemHealthReportWorkersGenerated(FrappeChildModel):
    doctype = 'System Health Report Workers'
    queues = models.CharField(max_length=140, blank=True, null=True, default='')
    count = models.IntegerField(null=True, blank=True)
    utilization = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    failed_jobs = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
