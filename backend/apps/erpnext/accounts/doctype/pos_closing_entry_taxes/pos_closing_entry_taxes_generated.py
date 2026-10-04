from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosClosingEntryTaxesGenerated(FrappeChildModel):
    doctype = 'POS Closing Entry Taxes'
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account_head = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
