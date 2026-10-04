from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemReorderGenerated(FrappeChildModel):
    doctype = 'Item Reorder'
    warehouse_group = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse_reorder_level = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse_reorder_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    material_request_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
