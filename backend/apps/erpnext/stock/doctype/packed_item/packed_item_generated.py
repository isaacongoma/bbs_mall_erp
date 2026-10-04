from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PackedItemGenerated(FrappeChildModel):
    doctype = 'Packed Item'
    parent_item = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    product_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    target_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    serial_no = models.TextField(blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    page_break = models.SmallIntegerField(default=0)
    prevdoc_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_detail_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    actual_batch_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    incoming_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    picked_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    packed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    use_serial_batch_fields = models.SmallIntegerField(default=0)
    delivered_by_supplier = models.SmallIntegerField(default=0)
    requested_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserve_stock = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
