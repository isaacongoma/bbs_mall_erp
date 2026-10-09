from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessPaymentReconciliationGenerated(FrappeModel):
    doctype = 'Process Payment Reconciliation'
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    party_type = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    receivable_payable_account = models.CharField(max_length=140, blank=True, null=True, default='')
    from_invoice_date = models.DateField(null=True, blank=True)
    to_invoice_date = models.DateField(null=True, blank=True)
    from_payment_date = models.DateField(null=True, blank=True)
    to_payment_date = models.DateField(null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_cash_account = models.CharField(max_length=140, blank=True, null=True, default='')
    error_log = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    default_advance_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
