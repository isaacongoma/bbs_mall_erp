from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsRegisteredPurchasesItemsGenerated(FrappeChildModel):
    doctype = 'Navari eTims Registered Purchases Items'
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    product_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    item_sequence = models.IntegerField(null=True, blank=True)
    etims_item_classification_code = models.CharField(max_length=140, blank=True, null=True, default='')
    barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    package = models.CharField(max_length=140, blank=True, null=True, default='')
    etims_packaging_unit_code = models.CharField(max_length=140, blank=True, null=True, default='')
    quantity = models.IntegerField(null=True, blank=True)
    purchase_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    unit_price = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    product_code = models.CharField(max_length=140, blank=True, null=True, default='')
    supply_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_classification_code_data = models.CharField(max_length=140, blank=True, null=True, default='')
    taxation_type_code = models.CharField(max_length=140, blank=True, null=True, default='')
    taxable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    etims_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    quantity_unit_code = models.CharField(max_length=140, blank=True, null=True, default='')
    is_mapped = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
