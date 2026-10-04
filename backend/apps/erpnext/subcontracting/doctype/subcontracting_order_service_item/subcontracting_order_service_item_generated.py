from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingOrderServiceItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Order Service Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fg_item = models.CharField(max_length=140, blank=True, null=True, default='')
    fg_item_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    purchase_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_item = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
