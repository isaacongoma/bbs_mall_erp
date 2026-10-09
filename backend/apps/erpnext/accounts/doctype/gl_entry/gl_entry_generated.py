from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class GlEntryGenerated(FrappeModel):
    doctype = 'GL Entry'
    amended_from = models.CharField(max_length=140, blank=True, default="")
    posting_date = models.DateField(null=True, blank=True)
    transaction_date = models.DateField(null=True, blank=True)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    debit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    debit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    against = models.TextField(blank=True, null=True, default='')
    against_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    against_voucher = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    is_opening = models.CharField(max_length=140, blank=True, null=True, default='')
    is_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    fiscal_year = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    to_rename = models.SmallIntegerField(default=1)
    due_date = models.DateField(null=True, blank=True)
    is_cancelled = models.SmallIntegerField(default=0)
    transaction_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    debit_in_transaction_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_transaction_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    voucher_subtype = models.TextField(blank=True, null=True, default='')
    debit_in_reporting_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_reporting_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reporting_currency_exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
