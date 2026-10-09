from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankStatementImportLogGenerated(FrappeModel):
    doctype = 'Bank Statement Import Log'
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    number_of_transactions = models.IntegerField(null=True, blank=True)
    closing_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    file = models.TextField(blank=True, null=True, default='')
    detected_date_format = models.CharField(max_length=140, blank=True, null=True, default='')
    detected_amount_format = models.CharField(max_length=140, blank=True, null=True, default='')
    detected_header_index = models.IntegerField(null=True, blank=True)
    detected_transaction_starting_index = models.IntegerField(null=True, blank=True)
    detected_transaction_ending_index = models.IntegerField(null=True, blank=True)
    pdf_tables = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Not Started')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    total_debits = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_credits = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_debit_transactions = models.IntegerField(null=True, blank=True)
    total_credit_transactions = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
