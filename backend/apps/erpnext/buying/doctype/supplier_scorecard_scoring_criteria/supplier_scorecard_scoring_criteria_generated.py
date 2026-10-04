from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierScorecardScoringCriteriaGenerated(FrappeChildModel):
    doctype = 'Supplier Scorecard Scoring Criteria'
    criteria_name = models.CharField(max_length=140, blank=True, null=True, default='')
    score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    formula = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
