from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WalletBillPaymentGenerated(FrappeModel):
    doctype = 'Wallet Bill Payment'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='WBP-.YYYY.-')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_before = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
