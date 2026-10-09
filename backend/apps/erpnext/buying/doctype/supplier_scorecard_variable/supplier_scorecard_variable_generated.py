from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SupplierScorecardVariableGenerated(FrappeModel):
    doctype = 'Supplier Scorecard Variable'
    variable_label = models.CharField(max_length=140, blank=True, null=True, default='')
    is_custom = models.SmallIntegerField(default=0)
    param_name = models.CharField(max_length=140, blank=True, null=True, default='')
    path = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
