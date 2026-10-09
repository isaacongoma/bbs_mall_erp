from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RepostPaymentLedgerItemsGenerated(FrappeChildModel):
    doctype = 'Repost Payment Ledger Items'
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
