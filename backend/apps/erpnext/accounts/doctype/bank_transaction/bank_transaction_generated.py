from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankTransactionGenerated(FrappeModel):
    doctype = 'Bank Transaction'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='ACC-BTN-.YYYY.-')
    date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    reference_number = models.TextField(blank=True, null=True, default='')
    transaction_id = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    unallocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    deposit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    withdrawal = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    transaction_type = models.CharField(max_length=50, blank=True, null=True, default='')
    bank_party_name = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_party_iban = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_party_account_number = models.CharField(max_length=140, blank=True, null=True, default='')
    included_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    excluded_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_rule_evaluated = models.SmallIntegerField(default=0)
    matched_transaction_rule = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
