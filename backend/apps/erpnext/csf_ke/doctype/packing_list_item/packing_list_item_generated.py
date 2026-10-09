from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackingListItemGenerated(FrappeChildModel):
    doctype = 'Packing List Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    invoiced_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    packed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    comments = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
