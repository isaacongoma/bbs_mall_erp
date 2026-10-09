from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProductionPlanItemGenerated(FrappeChildModel):
    doctype = 'Production Plan Item'
    include_exploded_items = models.SmallIntegerField(default=1)
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    planned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    planned_start_date = FrappeDateTimeField(null=True, blank=True)
    pending_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_item = models.CharField(max_length=140, blank=True, null=True, default='')
    product_bundle_item = models.CharField(max_length=140, blank=True, null=True, default='')
    item_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    temporary_name = models.CharField(max_length=140, blank=True, null=True, default='')
    planned_end_date = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
