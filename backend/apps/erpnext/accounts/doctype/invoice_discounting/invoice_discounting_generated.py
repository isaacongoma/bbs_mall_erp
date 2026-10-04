from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class InvoiceDiscountingGenerated(FrappeModel):
    doctype = 'Invoice Discounting'
    posting_date = models.DateField(null=True, blank=True)
    loan_start_date = models.DateField(null=True, blank=True)
    loan_period = models.IntegerField(null=True, blank=True)
    loan_end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    bank_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    short_term_loan = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_charges_account = models.CharField(max_length=140, blank=True, null=True, default='')
    accounts_receivable_credit = models.CharField(max_length=140, blank=True, null=True, default='')
    accounts_receivable_discounted = models.CharField(max_length=140, blank=True, null=True, default='')
    accounts_receivable_unpaid = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
