from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AllowedDimensionGenerated(FrappeChildModel):
    doctype = 'Allowed Dimension'
    accounting_dimension = models.CharField(max_length=140, blank=True, null=True, default='')
    dimension_value = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
