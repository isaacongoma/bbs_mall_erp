from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierScorecardScoringVariableGenerated(FrappeChildModel):
    doctype = 'Supplier Scorecard Scoring Variable'
    variable_label = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    param_name = models.CharField(max_length=140, blank=True, null=True, default='')
    path = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
