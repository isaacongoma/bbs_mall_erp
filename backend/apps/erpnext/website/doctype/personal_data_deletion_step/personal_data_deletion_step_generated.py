from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PersonalDataDeletionStepGenerated(FrappeChildModel):
    doctype = 'Personal Data Deletion Step'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    partial = models.SmallIntegerField(default=0)
    fields = models.TextField(blank=True, null=True, default='')
    filtered_by = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
