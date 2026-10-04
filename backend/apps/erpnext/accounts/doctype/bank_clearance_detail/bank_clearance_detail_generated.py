from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BankClearanceDetailGenerated(FrappeChildModel):
    doctype = 'Bank Clearance Detail'
    payment_document = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    against_account = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    cheque_number = models.CharField(max_length=140, blank=True, null=True, default='')
    cheque_date = models.DateField(null=True, blank=True)
    clearance_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
