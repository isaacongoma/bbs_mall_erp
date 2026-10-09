from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BlanketOrderItemGenerated(FrappeChildModel):
    doctype = 'Blanket Order Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    price_list_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_price_list_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    closed = models.SmallIntegerField(default=0)
    terms_and_conditions = models.TextField(blank=True, null=True, default='')
    party_item_code = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
