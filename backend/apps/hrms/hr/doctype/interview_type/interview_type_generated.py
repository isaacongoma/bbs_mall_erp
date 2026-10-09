from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InterviewTypeGenerated(FrappeModel):
    doctype = 'Interview Type'
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    expected_average_rating = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    interview_type_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
