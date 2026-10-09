from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankAccountBalanceGenerated(FrappeModel):
    doctype = 'Bank Account Balance'
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
