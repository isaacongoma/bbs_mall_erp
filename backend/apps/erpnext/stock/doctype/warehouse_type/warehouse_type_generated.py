from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WarehouseTypeGenerated(FrappeModel):
    doctype = 'Warehouse Type'
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
