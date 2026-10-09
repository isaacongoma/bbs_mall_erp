from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class InterviewGenerated(FrappeModel):
    doctype = 'Interview'
    job_applicant = models.CharField(max_length=140, blank=True, null=True, default='')
    job_opening = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    average_rating = models.CharField(max_length=140, blank=True, null=True, default='')
    interview_summary = models.TextField(blank=True, null=True, default='')
    resume_link = models.CharField(max_length=140, blank=True, null=True, default='')
    expected_average_rating = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    scheduled_on = models.DateField(null=True, blank=True)
    reminded = models.SmallIntegerField(default=0)
    from_time = FrappeTimeField(null=True, blank=True)
    to_time = FrappeTimeField(null=True, blank=True)
    interview_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
