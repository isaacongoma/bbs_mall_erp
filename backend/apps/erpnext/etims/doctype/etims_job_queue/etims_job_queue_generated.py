from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsJobQueueGenerated(FrappeModel):
    doctype = 'eTims Job Queue'
    route_key = models.CharField(max_length=140, blank=True, null=True, default='')
    handler_function = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    request_method = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    priority = models.IntegerField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    settings_name = models.CharField(max_length=140, blank=True, null=True, default='')
    request_data = models.TextField(blank=True, null=True, default='')
    integration_request = models.CharField(max_length=140, blank=True, null=True, default='')
    retry_count = models.IntegerField(null=True, blank=True)
    page_size = models.IntegerField(null=True, blank=True)
    page = models.IntegerField(null=True, blank=True)
    is_page = models.SmallIntegerField(default=0)
    last_attempt = FrappeDateTimeField(null=True, blank=True)
    completion_time = FrappeDateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True, default='')
    error_callback = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
