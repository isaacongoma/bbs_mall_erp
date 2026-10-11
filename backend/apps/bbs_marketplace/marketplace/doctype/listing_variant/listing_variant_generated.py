from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ListingVariantGenerated(FrappeChildModel):
    doctype = 'Listing Variant'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    options = models.TextField(blank=True, null=True, default='')
    sku = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    compare_at_price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    image = models.TextField(blank=True, null=True, default='')
    barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    weight_kg = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
