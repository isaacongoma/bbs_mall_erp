from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AccessLogGenerated(FrappeModel):
    doctype = 'Access Log'
    export_from = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    timestamp = FrappeDateTimeField(null=True, blank=True)
    reference_document = models.CharField(max_length=140, blank=True, null=True, default='')
    file_type = models.CharField(max_length=140, blank=True, null=True, default='')
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    page = models.TextField(blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    filters = models.TextField(blank=True, null=True, default='')
    columns = models.TextField(blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
