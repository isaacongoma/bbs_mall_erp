from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppraisalTemplateGoalGenerated(FrappeChildModel):
    doctype = 'Appraisal Template Goal'
    per_weightage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    key_result_area = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
