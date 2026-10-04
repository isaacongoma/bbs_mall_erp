from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProductionPlanMaterialRequestWarehouseGenerated(FrappeChildModel):
    doctype = 'Production Plan Material Request Warehouse'
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
