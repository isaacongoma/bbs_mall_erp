from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExitInterviewGenerated(FrappeModel):
    doctype = 'Exit Interview'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    relieving_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_document_name = models.CharField(max_length=140, blank=True, null=True, default='')
    date_of_joining = models.DateField(null=True, blank=True)
    reports_to = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    questionnaire_email_sent = models.SmallIntegerField(default=0)
    email = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_status = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    interview_summary = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
