from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobApplicantSourceGenerated(FrappeModel):
    doctype = 'Job Applicant Source'
    source_name = models.CharField(max_length=140, blank=True, null=True, default='')
    details = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
