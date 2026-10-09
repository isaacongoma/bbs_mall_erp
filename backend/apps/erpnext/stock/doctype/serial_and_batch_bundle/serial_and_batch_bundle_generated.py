from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SerialAndBatchBundleGenerated(FrappeModel):
    doctype = 'Serial and Batch Bundle'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    has_serial_no = models.SmallIntegerField(default=0)
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    has_batch_no = models.SmallIntegerField(default=0)
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    is_cancelled = models.SmallIntegerField(default=0)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    avg_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    type_of_transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    is_rejected = models.SmallIntegerField(default=0)
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    returned_against = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='SABB-.########')
    is_packed = models.SmallIntegerField(default=0)
    posting_datetime = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
