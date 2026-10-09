from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class StockLedgerEntryGenerated(FrappeModel):
    doctype = 'Stock Ledger Entry'
    amended_from = models.CharField(max_length=140, blank=True, default="")
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_no = models.TextField(blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    posting_time = FrappeTimeField(null=True, blank=True)
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    incoming_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outgoing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    qty_after_transaction = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_value_difference = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_queue = models.TextField(blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    is_cancelled = models.SmallIntegerField(default=0)
    to_rename = models.SmallIntegerField(default=1)
    dependant_sle_voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    recalculate_rate = models.SmallIntegerField(default=0)
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    has_batch_no = models.SmallIntegerField(default=0)
    has_serial_no = models.SmallIntegerField(default=0)
    is_adjustment_entry = models.SmallIntegerField(default=0)
    auto_created_serial_and_batch_bundle = models.SmallIntegerField(default=0)
    posting_datetime = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
