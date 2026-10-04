from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetRepairConsumedItemGenerated(FrappeChildModel):
    doctype = 'Asset Repair Consumed Item'
    valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumed_quantity = models.CharField(max_length=140, blank=True, null=True, default='')
    total_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    serial_no = models.TextField(blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    serial_and_batch_bundle = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
