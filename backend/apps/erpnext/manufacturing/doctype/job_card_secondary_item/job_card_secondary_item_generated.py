from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class JobCardSecondaryItemGenerated(FrappeChildModel):
    doctype = 'Job Card Secondary Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    secondary_item_type = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_secondary_item = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
