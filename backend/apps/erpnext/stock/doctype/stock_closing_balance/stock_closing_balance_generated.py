from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class StockClosingBalanceGenerated(FrappeModel):
    doctype = 'Stock Closing Balance'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    posting_time = FrappeTimeField(null=True, blank=True)
    posting_datetime = FrappeDateTimeField(null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_value_difference = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_closing_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    inventory_dimension_key = models.TextField(blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    fifo_queue = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
