from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkOrderItemGenerated(FrappeChildModel):
    doctype = 'Work Order Item'
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    transferred_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    requested_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    picked_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allow_alternative_item = models.SmallIntegerField(default=0)
    include_item_in_manufacturing = models.SmallIntegerField(default=0)
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_qty_at_source_warehouse = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_qty_at_wip_warehouse = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    operation_row_id = models.IntegerField(null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_additional_item = models.SmallIntegerField(default=0)
    voucher_detail_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    is_customer_provided_item = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
