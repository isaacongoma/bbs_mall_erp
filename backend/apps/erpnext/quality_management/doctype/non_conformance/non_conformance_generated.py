from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NonConformanceGenerated(FrappeModel):
    doctype = 'Non Conformance'
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    procedure = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    details = models.TextField(blank=True, null=True, default='')
    process_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    corrective_action = models.TextField(blank=True, null=True, default='')
    preventive_action = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
