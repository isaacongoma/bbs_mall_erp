from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InterviewFeedbackGenerated(FrappeModel):
    doctype = 'Interview Feedback'
    interview = models.CharField(max_length=140, blank=True, null=True, default='')
    interviewer = models.CharField(max_length=140, blank=True, null=True, default='')
    average_rating = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    feedback = models.TextField(blank=True, null=True, default='')
    result = models.CharField(max_length=140, blank=True, null=True, default='')
    job_applicant = models.CharField(max_length=140, blank=True, null=True, default='')
    interview_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
