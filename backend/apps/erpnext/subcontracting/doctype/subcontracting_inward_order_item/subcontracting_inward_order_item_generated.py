from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingInwardOrderItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Inward Order Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    bom = models.CharField(max_length=140, blank=True, null=True, default='')
    include_exploded_items = models.SmallIntegerField(default=0)
    delivered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    subcontracting_conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    process_loss_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    delivery_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
