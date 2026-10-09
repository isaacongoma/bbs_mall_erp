from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PromotionalSchemeProductDiscountGenerated(FrappeChildModel):
    doctype = 'Promotional Scheme Product Discount'
    disable = models.SmallIntegerField(default=0)
    rule_description = models.TextField(blank=True, null=True, default='')
    min_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    min_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    same_item = models.SmallIntegerField(default=0)
    free_item = models.CharField(max_length=140, blank=True, null=True, default='')
    free_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    free_item_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    free_item_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    threshold_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    priority = models.CharField(max_length=140, blank=True, null=True, default='')
    apply_multiple_pricing_rules = models.SmallIntegerField(default=0)
    is_recursive = models.SmallIntegerField(default=0)
    recurse_for = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    apply_recursion_over = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    round_free_qty = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
