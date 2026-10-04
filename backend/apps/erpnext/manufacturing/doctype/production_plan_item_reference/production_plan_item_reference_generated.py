from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ProductionPlanItemReferenceGenerated(FrappeChildModel):
    doctype = 'Production Plan Item Reference'
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_order_item = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_reference = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
