from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RepostPaymentLedgerGenerated(FrappeModel):
    doctype = 'Repost Payment Ledger'
    posting_date = models.DateField(null=True, blank=True)
    voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    repost_status = models.CharField(max_length=140, blank=True, null=True, default='')
    add_manually = models.SmallIntegerField(default=0)
    repost_error_log = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
