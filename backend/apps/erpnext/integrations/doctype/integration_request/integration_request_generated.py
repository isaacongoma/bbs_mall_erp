from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class IntegrationRequestGenerated(FrappeModel):
    doctype = 'Integration Request'
    integration_request_service = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Queued')
    data = models.TextField(blank=True, null=True, default='')
    output = models.TextField(blank=True, null=True, default='')
    error = models.TextField(blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    is_remote_request = models.SmallIntegerField(default=0)
    request_description = models.CharField(max_length=140, blank=True, null=True, default='')
    request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.TextField(blank=True, null=True, default='')
    request_headers = models.TextField(blank=True, null=True, default='')
    response_headers = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
