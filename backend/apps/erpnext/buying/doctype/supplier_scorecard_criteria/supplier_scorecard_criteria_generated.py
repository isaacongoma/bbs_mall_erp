from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierScorecardCriteriaGenerated(FrappeModel):
    doctype = 'Supplier Scorecard Criteria'
    criteria_name = models.CharField(max_length=140, blank=True, null=True, default='')
    max_score = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    formula = models.TextField(blank=True, null=True, default='')
    weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
