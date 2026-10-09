from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PutawayRuleGenerated(FrappeModel):
    doctype = 'Putaway Rule'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    capacity = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    priority = models.IntegerField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    disable = models.SmallIntegerField(default=0)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_capacity = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
