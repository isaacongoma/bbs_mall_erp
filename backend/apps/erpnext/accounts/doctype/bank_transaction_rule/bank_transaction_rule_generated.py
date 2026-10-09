from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankTransactionRuleGenerated(FrappeModel):
    doctype = 'Bank Transaction Rule'
    rule_name = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='Any')
    min_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    max_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rule_description = models.TextField(blank=True, null=True, default='')
    classify_as = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    priority = models.IntegerField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_entry_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
