from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PricingRuleDetailGenerated(FrappeChildModel):
    doctype = 'Pricing Rule Detail'
    pricing_rule = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    margin_type = models.CharField(max_length=140, blank=True, null=True, default='')
    rate_or_discount = models.CharField(max_length=140, blank=True, null=True, default='')
    child_docname = models.CharField(max_length=140, blank=True, null=True, default='')
    rule_applied = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
