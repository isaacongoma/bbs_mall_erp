from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LandedCostItemGenerated(FrappeChildModel):
    doctype = 'Landed Cost Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    receipt_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    receipt_document = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    applicable_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    purchase_receipt_item = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    is_fixed_asset = models.SmallIntegerField(default=0)
    stock_entry_item = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
