from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CodeListGenerated(FrappeModel):
    doctype = 'Code List'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    publisher = models.CharField(max_length=140, blank=True, null=True, default='')
    version = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    canonical_uri = models.CharField(max_length=140, blank=True, null=True, default='')
    publisher_id = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    default_common_code = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
