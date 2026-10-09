from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LedgerMergeGenerated(FrappeModel):
    doctype = 'Ledger Merge'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    root_type = models.CharField(max_length=140, blank=True, null=True, default='')
    account_name = models.CharField(max_length=140, blank=True, null=True, default='')
    is_group = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
