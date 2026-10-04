from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemWiseTaxDetailGenerated(FrappeChildModel):
    doctype = 'Item Wise Tax Detail'
    item_row = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_row = models.CharField(max_length=140, blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    taxable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
