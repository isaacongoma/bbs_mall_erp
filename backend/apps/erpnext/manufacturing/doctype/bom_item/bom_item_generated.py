from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomItemGenerated(FrappeChildModel):
    doctype = 'BOM Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    set_rate_of_sub_assembly_item_based_on_bom = models.SmallIntegerField(default=1)
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    qty_consumed_per_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allow_alternative_item = models.SmallIntegerField(default=0)
    include_item_in_manufacturing = models.SmallIntegerField(default=0)
    original_item = models.CharField(max_length=140, blank=True, null=True, default='')
    has_variants = models.SmallIntegerField(default=0)
    sourced_by_supplier = models.SmallIntegerField(default=0)
    do_not_explode = models.SmallIntegerField(default=0)
    is_stock_item = models.SmallIntegerField(default=0)
    operation_row_id = models.IntegerField(null=True, blank=True)
    is_sub_assembly_item = models.SmallIntegerField(default=0)
    is_phantom_item = models.SmallIntegerField(default=0)
    is_balance_item = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
