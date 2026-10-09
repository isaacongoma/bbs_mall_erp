from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SubmissionQueueGenerated(FrappeModel):
    doctype = 'Submission Queue'
    job_id = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    enqueued_by = models.CharField(max_length=140, blank=True, null=True, default='')
    ended_at = FrappeDateTimeField(null=True, blank=True)
    created_at = FrappeDateTimeField(null=True, blank=True)
    exception = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
