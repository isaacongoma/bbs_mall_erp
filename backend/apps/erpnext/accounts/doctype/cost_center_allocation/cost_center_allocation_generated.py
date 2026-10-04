from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CostCenterAllocationGenerated(FrappeModel):
    doctype = 'Cost Center Allocation'
    main_cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    valid_from = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
