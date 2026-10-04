from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class RepostAccountingLedgerGenerated(FrappeModel):
    doctype = 'Repost Accounting Ledger'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    delete_cancelled_entries = models.SmallIntegerField(default=0)
    error_log = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    scheduled_job = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
