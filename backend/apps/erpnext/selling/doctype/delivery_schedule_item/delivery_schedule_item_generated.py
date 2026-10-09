from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DeliveryScheduleItemGenerated(FrappeModel):
    doctype = 'Delivery Schedule Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
