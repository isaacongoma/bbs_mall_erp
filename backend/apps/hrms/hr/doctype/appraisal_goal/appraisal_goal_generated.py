from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraisalGoalGenerated(FrappeChildModel):
    doctype = 'Appraisal Goal'
    kra = models.TextField(blank=True, null=True, default='')
    per_weightage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    score_earned = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
