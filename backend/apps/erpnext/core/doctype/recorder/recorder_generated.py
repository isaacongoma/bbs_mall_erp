from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RecorderGenerated(FrappeModel):
    doctype = 'Recorder'
    path = models.CharField(max_length=140, blank=True, null=True, default='')
    cmd = models.CharField(max_length=140, blank=True, null=True, default='')
    duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    time = FrappeDateTimeField(null=True, blank=True)
    number_of_queries = models.IntegerField(null=True, blank=True)
    time_in_queries = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    number_of_events = models.IntegerField(null=True, blank=True)
    request_headers = models.TextField(blank=True, null=True, default='')
    form_dict = models.TextField(blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    event_type = models.CharField(max_length=140, blank=True, null=True, default='')
    apps_involved = models.CharField(max_length=140, blank=True, null=True, default='')
    profile = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
