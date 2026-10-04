from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class UnreconcilePaymentEntriesGenerated(FrappeChildModel):
    doctype = 'Unreconcile Payment Entries'
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    unlinked = models.SmallIntegerField(default=0)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
