from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class StockReconciliationItemGenerated(FrappeChildModel):
    doctype = 'Stock Reconciliation Item'
    barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    serial_no = models.TextField(blank=True, null=True, default='')
    current_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_serial_no = models.TextField(blank=True, null=True, default='')
    current_valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    quantity_difference = models.CharField(max_length=140, blank=True, null=True, default='')
    amount_difference = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    allow_zero_valuation_rate = models.SmallIntegerField(default=0)
    has_item_scanned = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    current_serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    use_serial_batch_fields = models.SmallIntegerField(default=0)
    reconcile_all_serial_batch = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
