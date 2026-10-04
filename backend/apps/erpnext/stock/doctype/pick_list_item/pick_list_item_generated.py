from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PickListItemGenerated(FrappeChildModel):
    doctype = 'Pick List Item'
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    picked_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_item = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    product_bundle_item = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    use_serial_batch_fields = models.SmallIntegerField(default=0)
    delivered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    transferred_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company_total_stock = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
