from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankTransactionRuleAccountsGenerated(FrappeChildModel):
    doctype = 'Bank Transaction Rule Accounts'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    debit = models.CharField(max_length=140, blank=True, null=True, default='')
    credit = models.CharField(max_length=140, blank=True, null=True, default='')
    user_remark = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
