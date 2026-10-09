from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RqJobGenerated(FrappeModel):
    doctype = 'RQ Job'
    queue = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    job_id = models.CharField(max_length=140, blank=True, null=True, default='')
    exc_info = models.TextField(blank=True, null=True, default='')
    job_name = models.CharField(max_length=140, blank=True, null=True, default='')
    arguments = models.TextField(blank=True, null=True, default='')
    timeout = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    time_taken = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    started_at = FrappeDateTimeField(null=True, blank=True)
    ended_at = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
