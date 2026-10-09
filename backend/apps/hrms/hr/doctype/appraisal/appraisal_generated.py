from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraisalGenerated(FrappeModel):
    doctype = 'Appraisal'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    appraisal_cycle = models.CharField(max_length=140, blank=True, null=True, default='')
    total_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    self_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    avg_feedback_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    employee_image = models.TextField(blank=True, null=True, default='')
    appraisal_template = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    reflections = models.TextField(blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    rate_goals_manually = models.SmallIntegerField(default=0)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    goal_score_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    final_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
