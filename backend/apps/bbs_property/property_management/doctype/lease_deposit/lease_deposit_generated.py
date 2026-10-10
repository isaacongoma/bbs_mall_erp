from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseDepositGenerated(FrappeModel):
    doctype = 'Lease Deposit'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='LDP-.YYYY.-.#####')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_type = models.CharField(max_length=140, blank=True, null=True, default='Receipt')
    posting_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_no = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_date = models.DateField(null=True, blank=True)
    against_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    remarks = models.TextField(blank=True, null=True, default='')
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
