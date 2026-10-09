from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraisalCycleGenerated(FrappeModel):
    doctype = 'Appraisal Cycle'
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    designation = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    cycle_name = models.CharField(max_length=140, blank=True, null=True, default='')
    kra_evaluation_method = models.CharField(max_length=140, blank=True, null=True, default='Automated Based on Goal Progress')
    status = models.CharField(max_length=140, blank=True, null=True, default='Not Started')
    final_score_formula = models.TextField(blank=True, null=True, default='')
    calculate_final_score_based_on_formula = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
