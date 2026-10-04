from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkstationCostGenerated(FrappeChildModel):
    doctype = 'Workstation Cost'
    operating_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    operating_component = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
