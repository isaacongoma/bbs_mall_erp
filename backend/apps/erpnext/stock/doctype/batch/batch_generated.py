from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BatchGenerated(FrappeModel):
    doctype = 'Batch'
    disabled = models.SmallIntegerField(default=0)
    batch_id = models.CharField(max_length=140, blank=True, null=True, default='')
    item = models.CharField(max_length=140, blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    parent_batch = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    qty_to_produce = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    use_batchwise_valuation = models.SmallIntegerField(default=0)
    allow_negative_stock_for_batch = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
