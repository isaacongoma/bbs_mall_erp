from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RqWorkerGenerated(FrappeModel):
    doctype = 'RQ Worker'
    worker_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    current_job_id = models.CharField(max_length=140, blank=True, null=True, default='')
    pid = models.CharField(max_length=140, blank=True, null=True, default='')
    last_heartbeat = FrappeDateTimeField(null=True, blank=True)
    birth_date = FrappeDateTimeField(null=True, blank=True)
    successful_job_count = models.IntegerField(null=True, blank=True)
    failed_job_count = models.IntegerField(null=True, blank=True)
    total_working_time = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    queue = models.CharField(max_length=140, blank=True, null=True, default='')
    queue_type = models.CharField(max_length=140, blank=True, null=True, default='')
    utilization_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
