from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class MaterialRequestPlanItemGenerated(FrappeChildModel):
    doctype = 'Material Request Plan Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_type = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    quantity = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    min_order_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    from_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    safety_stock = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_qty_for_production = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    required_bom_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    schedule_date = models.DateField(null=True, blank=True)
    stock_reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    from_bom = models.CharField(max_length=140, blank=True, null=True, default='')
    sub_assembly_item_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    main_item_code = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
