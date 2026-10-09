from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AccountClosingBalanceGenerated(FrappeModel):
    doctype = 'Account Closing Balance'
    amended_from = models.CharField(max_length=140, blank=True, default="")
    closing_date = models.DateField(null=True, blank=True)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    debit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    debit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    period_closing_voucher = models.CharField(max_length=140, blank=True, null=True, default='')
    is_period_closing_voucher_entry = models.SmallIntegerField(default=0)
    debit_in_reporting_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_reporting_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reporting_currency_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
