from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CallLogGenerated(FrappeModel):
    doctype = 'Call Log'
    id = models.CharField(max_length=140, blank=True, null=True, default='')
    locals()['from'] = models.CharField(max_length=140, blank=True, null=True, default='')
    to = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    recording_url = models.CharField(max_length=140, blank=True, null=True, default='')
    medium = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    summary = models.TextField(blank=True, null=True, default='')
    start_time = FrappeDateTimeField(null=True, blank=True)
    end_time = FrappeDateTimeField(null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_user_id = models.CharField(max_length=140, blank=True, null=True, default='')
    type_of_call = models.CharField(max_length=140, blank=True, null=True, default='')
    call_received_by = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
