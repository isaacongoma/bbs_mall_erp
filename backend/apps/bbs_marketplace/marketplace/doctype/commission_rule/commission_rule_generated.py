from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CommissionRuleGenerated(FrappeModel):
    doctype = 'Commission Rule'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='COM-RULE-.####')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    applies_to = models.CharField(max_length=140, blank=True, null=True, default='Category')
    priority = models.IntegerField(null=True, blank=True)
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='Both')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    rate_percent = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fixed_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    min_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
