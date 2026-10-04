from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BomExplosionItemGenerated(FrappeChildModel):
    doctype = 'BOM Explosion Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    qty_consumed_per_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    include_item_in_manufacturing = models.SmallIntegerField(default=0)
    sourced_by_supplier = models.SmallIntegerField(default=0)
    is_sub_assembly_item = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
