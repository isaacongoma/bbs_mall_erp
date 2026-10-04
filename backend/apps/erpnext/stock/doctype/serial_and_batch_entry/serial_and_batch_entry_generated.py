from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SerialAndBatchEntryGenerated(FrappeChildModel):
    doctype = 'Serial and Batch Entry'
    serial_no = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    incoming_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outgoing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_value_difference = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_outward = models.SmallIntegerField(default=0)
    stock_queue = models.TextField(blank=True, null=True, default='')
    delivered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_for_reservation = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_datetime = models.DateTimeField(null=True, blank=True)
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    type_of_transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    is_cancelled = models.SmallIntegerField(default=0)
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
