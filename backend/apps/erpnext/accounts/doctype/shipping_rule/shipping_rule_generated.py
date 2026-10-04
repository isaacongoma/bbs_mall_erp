from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShippingRuleGenerated(FrappeModel):
    doctype = 'Shipping Rule'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    shipping_rule_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    calculate_based_on = models.CharField(max_length=140, blank=True, null=True, default='Fixed')
    shipping_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
