from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ExchangeRateRevaluationAccountGenerated(FrappeChildModel):
    doctype = 'Exchange Rate Revaluation Account'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    balance_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    current_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    balance_in_base_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    new_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    new_balance_in_base_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    zero_balance = models.SmallIntegerField(default=0)
    new_balance_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
