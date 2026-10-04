from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShippingRuleConditionGenerated(FrappeChildModel):
    doctype = 'Shipping Rule Condition'
    from_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    to_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    shipping_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
