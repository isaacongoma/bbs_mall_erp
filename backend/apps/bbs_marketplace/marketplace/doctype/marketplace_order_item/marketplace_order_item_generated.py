from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceOrderItemGenerated(FrappeChildModel):
    doctype = 'Marketplace Order Item'
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    variant_item = models.CharField(max_length=140, blank=True, null=True, default='')
    variant_label = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    seller_order = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    voucher_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    download_count = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
