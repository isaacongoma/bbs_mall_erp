from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PricingRuleItemCodeGenerated(FrappeChildModel):
    doctype = 'Pricing Rule Item Code'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
