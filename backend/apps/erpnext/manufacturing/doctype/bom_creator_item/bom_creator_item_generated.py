from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BomCreatorItemGenerated(FrappeChildModel):
    doctype = 'BOM Creator Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    fg_item = models.CharField(max_length=140, blank=True, null=True, default='')
    is_expandable = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    do_not_explode = models.SmallIntegerField(default=1)
    instruction = models.TextField(blank=True, null=True, default='')
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sourced_by_supplier = models.SmallIntegerField(default=0)
    fg_reference_id = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_row_no = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_created = models.SmallIntegerField(default=0)
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    is_subcontracted = models.SmallIntegerField(default=0)
    is_phantom_item = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
