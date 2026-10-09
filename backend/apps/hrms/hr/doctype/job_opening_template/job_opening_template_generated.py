from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JobOpeningTemplateGenerated(FrappeModel):
    doctype = 'Job Opening Template'
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    employment_type = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    template_title = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    upper_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    lower_range = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    salary_per = models.CharField(max_length=140, blank=True, null=True, default='Month')
    publish_salary_range = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
