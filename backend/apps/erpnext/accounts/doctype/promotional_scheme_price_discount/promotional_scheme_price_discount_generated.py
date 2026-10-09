from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PromotionalSchemePriceDiscountGenerated(FrappeChildModel):
    doctype = 'Promotional Scheme Price Discount'
    disable = models.SmallIntegerField(default=0)
    rule_description = models.TextField(blank=True, null=True, default='')
    min_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    min_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate_or_discount = models.CharField(max_length=140, blank=True, null=True, default='Discount Percentage')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    for_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    threshold_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    validate_applied_rule = models.SmallIntegerField(default=0)
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    apply_multiple_pricing_rules = models.SmallIntegerField(default=0)
    apply_discount_on_rate = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
