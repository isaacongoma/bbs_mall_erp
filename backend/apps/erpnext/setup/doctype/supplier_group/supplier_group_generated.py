from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierGroupGenerated(FrappeTreeModel):
    doctype = 'Supplier Group'
    supplier_group_name = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_supplier_group = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)
    payment_terms = models.CharField(max_length=140, blank=True, null=True, default='')
    lft = models.IntegerField(null=True, blank=True)
    rgt = models.IntegerField(null=True, blank=True)
    old_parent = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
