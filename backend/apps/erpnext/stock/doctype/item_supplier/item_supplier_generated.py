from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemSupplierGenerated(FrappeChildModel):
    doctype = 'Item Supplier'
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_part_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
