from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MaterialRequestItemGenerated(FrappeChildModel):
    doctype = 'Material Request Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_date = models.DateField(null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    lead_time_date = models.DateField(null=True, blank=True)
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    production_plan = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_plan_item = models.CharField(max_length=140, blank=True, null=True, default='')
    min_order_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    page_break = models.SmallIntegerField(default=0)
    received_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    manufacturer = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturer_part_no = models.CharField(max_length=140, blank=True, null=True, default='')
    from_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_no = models.CharField(max_length=140, blank=True, null=True, default='')
    job_card_item = models.CharField(max_length=140, blank=True, null=True, default='')
    wip_composite_asset = models.CharField(max_length=140, blank=True, null=True, default='')
    price_list_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reorder_level = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reorder_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_on_hand = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    picked_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    packed_item = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
