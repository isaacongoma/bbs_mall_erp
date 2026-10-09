from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RecorderEventGenerated(FrappeChildModel):
    doctype = 'Recorder Event'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_name = models.CharField(max_length=140, blank=True, null=True, default='')
    apps = models.CharField(max_length=140, blank=True, null=True, default='')
    queries = models.IntegerField(null=True, blank=True)
    duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    depth = models.IntegerField(null=True, blank=True)
    seq = models.IntegerField(null=True, blank=True)
    handlers = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
