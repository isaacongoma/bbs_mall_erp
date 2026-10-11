from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerWithdrawalGenerated(FrappeModel):
    doctype = 'Seller Withdrawal'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='WDR-.YYYY.-')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Requested')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    requested_on = FrappeDateTimeField(null=True, blank=True)
    processed_on = FrappeDateTimeField(null=True, blank=True)
    payout_account = models.CharField(max_length=140, blank=True, null=True, default='')
    mpesa_number = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_holder = models.CharField(max_length=140, blank=True, null=True, default='')
    balance_before = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    approved_by = models.CharField(max_length=140, blank=True, null=True, default='')
    conversation_id = models.CharField(max_length=140, blank=True, null=True, default='')
    originator_conversation_id = models.CharField(max_length=140, blank=True, null=True, default='')
    receipt_no = models.CharField(max_length=140, blank=True, null=True, default='')
    failure_reason = models.TextField(blank=True, null=True, default='')
    hold_journal = models.CharField(max_length=140, blank=True, null=True, default='')
    payout_journal = models.CharField(max_length=140, blank=True, null=True, default='')
    wallet_transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
