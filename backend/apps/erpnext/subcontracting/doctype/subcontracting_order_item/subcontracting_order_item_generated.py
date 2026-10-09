from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SubcontractingOrderItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Order Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    schedule_date = models.DateField(null=True, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturer = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturer_part_no = models.CharField(max_length=140, blank=True, null=True, default='')
    bom = models.CharField(max_length=140, blank=True, null=True, default='')
    include_exploded_items = models.SmallIntegerField(default=0)
    service_cost_per_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    additional_cost_per_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rm_cost_per_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    page_break = models.SmallIntegerField(default=0)
    received_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_item = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    job_card = models.CharField(max_length=140, blank=True, null=True, default='')
    subcontracting_conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    production_plan_sub_assembly_item = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
