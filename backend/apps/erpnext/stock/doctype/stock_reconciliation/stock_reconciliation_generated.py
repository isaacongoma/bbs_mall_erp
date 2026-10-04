from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class StockReconciliationGenerated(FrappeModel):
    doctype = 'Stock Reconciliation'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    purpose = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    posting_time = models.TimeField(null=True, blank=True)
    set_posting_time = models.SmallIntegerField(default=0)
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    difference_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    scan_barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    scan_mode = models.SmallIntegerField(default=0)
    set_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    last_scanned_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
