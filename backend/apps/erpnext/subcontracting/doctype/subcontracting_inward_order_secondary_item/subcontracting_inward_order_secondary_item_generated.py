from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingInwardOrderSecondaryItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Inward Order Secondary Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    produced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    delivered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fg_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    secondary_item_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
