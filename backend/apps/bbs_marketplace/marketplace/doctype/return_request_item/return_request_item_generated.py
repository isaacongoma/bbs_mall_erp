from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ReturnRequestItemGenerated(FrappeChildModel):
    doctype = 'Return Request Item'
    order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    listing = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_condition = models.CharField(max_length=140, blank=True, null=True, default='Opened')
    refund_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    restock = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
