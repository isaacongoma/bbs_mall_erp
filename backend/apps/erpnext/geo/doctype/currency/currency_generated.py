from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CurrencyGenerated(FrappeModel):
    doctype = 'Currency'
    currency_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=0)
    fraction = models.CharField(max_length=140, blank=True, null=True, default='')
    fraction_units = models.IntegerField(null=True, blank=True)
    smallest_currency_fraction_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    symbol = models.CharField(max_length=140, blank=True, null=True, default='')
    number_format = models.CharField(max_length=140, blank=True, null=True, default='')
    symbol_on_right = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
