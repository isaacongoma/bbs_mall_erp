from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkOrderAdditionalItemGenerated(FrappeChildModel):
    doctype = 'Work Order Additional Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    secondary_item_type = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
