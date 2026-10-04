from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PackingSlipItemGenerated(FrappeChildModel):
    doctype = 'Packing Slip Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    weight_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    page_break = models.SmallIntegerField(default=0)
    dn_detail = models.CharField(max_length=140, blank=True, null=True, default='')
    pi_detail = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
