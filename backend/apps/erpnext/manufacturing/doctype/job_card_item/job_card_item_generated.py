from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class JobCardItemGenerated(FrappeChildModel):
    doctype = 'Job Card Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    source_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allow_alternative_item = models.SmallIntegerField(default=0)
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    transferred_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
