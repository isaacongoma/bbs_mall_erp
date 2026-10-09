from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobApplicantGenerated(FrappeModel):
    doctype = 'Job Applicant'
    applicant_name = models.CharField(max_length=140, blank=True, null=True, default='')
    email_id = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    job_title = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    source_name = models.CharField(max_length=140, blank=True, null=True, default='')
    cover_letter = models.TextField(blank=True, null=True, default='')
    resume_attachment = models.TextField(blank=True, null=True, default='')
    notes = models.CharField(max_length=140, blank=True, null=True, default='')
    phone_number = models.CharField(max_length=140, blank=True, null=True, default='')
    country = models.CharField(max_length=140, blank=True, null=True, default='')
    resume_link = models.CharField(max_length=140, blank=True, null=True, default='')
    applicant_rating = models.CharField(max_length=140, blank=True, null=True, default='')
    lower_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    upper_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_referral = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
