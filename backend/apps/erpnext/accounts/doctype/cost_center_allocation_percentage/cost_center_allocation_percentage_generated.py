from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CostCenterAllocationPercentageGenerated(FrappeChildModel):
    doctype = 'Cost Center Allocation Percentage'
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
