from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PurchaseReceiptItemSuppliedGenerated(FrappeChildModel):
    doctype = 'Purchase Receipt Item Supplied'
    main_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    rm_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_stock = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    purchase_order = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
