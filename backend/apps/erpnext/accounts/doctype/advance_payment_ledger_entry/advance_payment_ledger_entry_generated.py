from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AdvancePaymentLedgerEntryGenerated(FrappeModel):
    doctype = 'Advance Payment Ledger Entry'
    amended_from = models.CharField(max_length=140, blank=True, default="")
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    against_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    against_voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    event = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    delinked = models.SmallIntegerField(default=0)
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
