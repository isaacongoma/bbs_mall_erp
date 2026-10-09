from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LedgerHealthGenerated(FrappeModel):
    doctype = 'Ledger Health'
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    debit_credit_mismatch = models.SmallIntegerField(default=0)
    checked_on = FrappeDateTimeField(null=True, blank=True)
    general_and_payment_ledger_mismatch = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
