from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class JournalEntryAccountGenerated(FrappeChildModel):
    doctype = 'Journal Entry Account'
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_type = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default=':Company')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    debit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    debit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit_in_account_currency = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    credit = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_due_date = models.DateField(null=True, blank=True)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    is_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    user_remark = models.TextField(blank=True, null=True, default='')
    against_account = models.TextField(blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')
    is_tax_withholding_account = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
