from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerWalletTransactionGenerated(FrappeModel):
    doctype = 'Seller Wallet Transaction'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='WLT-.YYYY.-')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = FrappeDateTimeField(null=True, blank=True)
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Posted')
    available_on = models.DateField(null=True, blank=True)
    balance_after = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    released_on = FrappeDateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
