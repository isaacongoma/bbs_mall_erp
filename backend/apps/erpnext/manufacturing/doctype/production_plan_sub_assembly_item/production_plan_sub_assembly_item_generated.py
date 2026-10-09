from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductionPlanSubAssemblyItemGenerated(FrappeChildModel):
    doctype = 'Production Plan Sub Assembly Item'
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    purchase_order = models.CharField(max_length=140, blank=True, null=True, default='')
    received_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    production_plan_item = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_level = models.IntegerField(null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    production_item = models.CharField(max_length=140, blank=True, null=True, default='')
    indent = models.IntegerField(null=True, blank=True)
    fg_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    type_of_manufacturing = models.CharField(max_length=140, blank=True, null=True, default='In House')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_date = FrappeDateTimeField(null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    wo_produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_end_date = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
