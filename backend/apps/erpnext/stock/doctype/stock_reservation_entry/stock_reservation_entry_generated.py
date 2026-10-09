from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class StockReservationEntryGenerated(FrappeModel):
    doctype = 'Stock Reservation Entry'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    delivered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    available_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    voucher_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    has_serial_no = models.SmallIntegerField(default=0)
    has_batch_no = models.SmallIntegerField(default=0)
    reservation_based_on = models.CharField(max_length=140, blank=True, null=True, default='Qty')
    from_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    from_voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    transferred_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
