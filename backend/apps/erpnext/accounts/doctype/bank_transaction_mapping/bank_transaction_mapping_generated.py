from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankTransactionMappingGenerated(FrappeChildModel):
    doctype = 'Bank Transaction Mapping'
    bank_transaction_field = models.CharField(max_length=140, blank=True, null=True, default='')
    file_field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
