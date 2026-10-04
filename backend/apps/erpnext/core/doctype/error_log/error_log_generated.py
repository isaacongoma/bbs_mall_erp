from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ErrorLogGenerated(FrappeModel):
    doctype = 'Error Log'
    seen = models.SmallIntegerField(default=0)
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    error = models.TextField(blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    trace_id = models.CharField(max_length=140, blank=True, null=True, default='')
    metadata = models.TextField(blank=True, null=True, default='')
    fingerprint = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
