from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProductionPlanGenerated(FrappeModel):
    doctype = 'Production Plan'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    get_items_from = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    include_non_stock_items = models.SmallIntegerField(default=1)
    include_subcontracted_items = models.SmallIntegerField(default=1)
    ignore_existing_ordered_qty = models.SmallIntegerField(default=1)
    total_planned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    for_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    raw_material_group_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_status = models.CharField(max_length=140, blank=True, null=True, default='')
    include_safety_stock = models.SmallIntegerField(default=0)
    combine_items = models.SmallIntegerField(default=0)
    from_delivery_date = models.DateField(null=True, blank=True)
    to_delivery_date = models.DateField(null=True, blank=True)
    combine_sub_items = models.SmallIntegerField(default=0)
    skip_available_sub_assembly_item = models.SmallIntegerField(default=1)
    sub_assembly_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    consider_minimum_order_qty = models.SmallIntegerField(default=0)
    reserve_stock = models.SmallIntegerField(default=0)
    no_of_shifts = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
