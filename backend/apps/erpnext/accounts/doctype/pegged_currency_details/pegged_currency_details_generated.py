from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PeggedCurrencyDetailsGenerated(FrappeChildModel):
    doctype = 'Pegged Currency Details'
    source_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    pegged_exchange_rate = models.CharField(max_length=140, blank=True, null=True, default='')
    pegged_against = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
