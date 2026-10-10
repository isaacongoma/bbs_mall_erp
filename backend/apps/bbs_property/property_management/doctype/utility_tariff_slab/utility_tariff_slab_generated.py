from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UtilityTariffSlabGenerated(FrappeChildModel):
    doctype = 'Utility Tariff Slab'
    from_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    to_unit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
