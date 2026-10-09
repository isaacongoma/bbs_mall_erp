from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LedgerMergeAccountsGenerated(FrappeChildModel):
    doctype = 'Ledger Merge Accounts'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    merged = models.SmallIntegerField(default=0)
    account_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
