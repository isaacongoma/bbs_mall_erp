from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PreparedReportGenerated(FrappeModel):
    doctype = 'Prepared Report'
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    report_end_time = FrappeDateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True, default='')
    filters = models.TextField(blank=True, null=True, default='')
    job_id = models.CharField(max_length=140, blank=True, null=True, default='')
    queued_by = models.CharField(max_length=140, blank=True, null=True, default='')
    queued_at = FrappeDateTimeField(null=True, blank=True)
    peak_memory_usage = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
