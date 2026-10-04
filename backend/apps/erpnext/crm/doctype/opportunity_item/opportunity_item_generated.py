from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class OpportunityItemGenerated(FrappeChildModel):
    doctype = 'Opportunity Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
