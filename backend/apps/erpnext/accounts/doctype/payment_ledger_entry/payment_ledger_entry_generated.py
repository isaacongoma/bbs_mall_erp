from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentLedgerEntryGenerated(FrappeModel):
    doctype = 'Payment Ledger Entry'
    amended_from = models.CharField(max_length=140, blank=True, default="")
    posting_date = models.DateField(null=True, blank=True)
    account_type = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    against_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    against_voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    amount_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    delinked = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    voucher_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
