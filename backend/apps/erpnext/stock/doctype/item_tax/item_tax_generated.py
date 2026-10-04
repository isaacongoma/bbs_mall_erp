from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemTaxGenerated(FrappeChildModel):
    doctype = 'Item Tax'
    item_tax_template = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_category = models.CharField(max_length=140, blank=True, null=True, default='')
    valid_from = models.DateField(null=True, blank=True)
    maximum_net_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    minimum_net_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
