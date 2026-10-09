from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomSecondaryItemGenerated(FrappeChildModel):
    doctype = 'BOM Secondary Item'
    secondary_item_type = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    image = models.TextField(blank=True, null=True, default='')
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_allocation_per = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    process_loss_per = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    base_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valuation_type = models.CharField(max_length=140, blank=True, null=True, default='Valuation Rate')
    process_loss_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
