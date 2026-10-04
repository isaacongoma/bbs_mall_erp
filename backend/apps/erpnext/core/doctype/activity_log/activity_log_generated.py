from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ActivityLogGenerated(FrappeModel):
    doctype = 'Activity Log'
    subject = models.TextField(blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    communication_date = models.DateTimeField(null=True, blank=True)
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    timeline_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    timeline_name = models.CharField(max_length=140, blank=True, null=True, default='')
    link_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    link_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    ip_address = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
