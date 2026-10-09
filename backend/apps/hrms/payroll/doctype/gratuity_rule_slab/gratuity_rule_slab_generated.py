from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GratuityRuleSlabGenerated(FrappeChildModel):
    doctype = 'Gratuity Rule Slab'
    fraction_of_applicable_earnings = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    from_year = models.IntegerField(null=True, blank=True)
    to_year = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
