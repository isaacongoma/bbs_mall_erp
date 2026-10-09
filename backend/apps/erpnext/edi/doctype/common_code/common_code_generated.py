from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CommonCodeGenerated(FrappeModel):
    doctype = 'Common Code'
    code_list = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=300, blank=True, null=True, default='')
    common_code = models.CharField(max_length=300, blank=True, null=True, default='')
    additional_data = models.TextField(blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    canonical_uri = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
