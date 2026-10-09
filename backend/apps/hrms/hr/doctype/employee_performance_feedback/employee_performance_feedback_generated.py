from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeePerformanceFeedbackGenerated(FrappeModel):
    doctype = 'Employee Performance Feedback'
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    total_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    feedback = models.TextField(blank=True, null=True, default='')
    added_on = FrappeDateTimeField(null=True, blank=True)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    appraisal = models.CharField(max_length=140, blank=True, null=True, default='')
    reviewer_designation = models.CharField(max_length=140, blank=True, null=True, default='')
    reviewer = models.CharField(max_length=140, blank=True, null=True, default='')
    reviewer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    appraisal_cycle = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
