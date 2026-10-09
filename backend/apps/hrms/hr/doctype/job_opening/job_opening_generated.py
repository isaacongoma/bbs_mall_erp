from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobOpeningGenerated(FrappeModel):
    doctype = 'Job Opening'
    job_title = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    staffing_plan = models.CharField(max_length=140, blank=True, null=True, default='')
    planned_vacancies = models.IntegerField(null=True, blank=True)
    publish = models.SmallIntegerField(default=0)
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    lower_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    upper_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    job_application_route = models.CharField(max_length=140, blank=True, null=True, default='')
    publish_salary_range = models.SmallIntegerField(default=0)
    job_requisition = models.CharField(max_length=140, blank=True, null=True, default='')
    vacancies = models.IntegerField(null=True, blank=True)
    posted_on = FrappeDateTimeField(null=True, blank=True)
    closes_on = models.DateField(null=True, blank=True)
    employment_type = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    closed_on = models.DateField(null=True, blank=True)
    salary_per = models.CharField(max_length=140, blank=True, null=True, default='Month')
    publish_applications_received = models.SmallIntegerField(default=1)
    prevent_duplicate_applicant = models.SmallIntegerField(default=0)
    job_opening_template = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
