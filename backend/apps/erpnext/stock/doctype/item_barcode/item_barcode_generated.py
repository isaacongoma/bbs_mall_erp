from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemBarcodeGenerated(FrappeChildModel):
    doctype = 'Item Barcode'
    barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    barcode_type = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
