from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShippingRuleCountryGenerated(FrappeChildModel):
    doctype = 'Shipping Rule Country'
    country = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
