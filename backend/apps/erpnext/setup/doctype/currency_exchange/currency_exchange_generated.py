from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CurrencyExchangeGenerated(FrappeModel):
    doctype = 'Currency Exchange'
    date = models.DateField(null=True, blank=True)
    from_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    to_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    for_buying = models.SmallIntegerField(default=1)
    for_selling = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
