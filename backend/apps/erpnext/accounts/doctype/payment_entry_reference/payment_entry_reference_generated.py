from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentEntryReferenceGenerated(FrappeChildModel):
    doctype = 'Payment Entry Reference'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    bill_no = models.CharField(max_length=140, blank=True, null=True, default='')
    total_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payment_term = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_type = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_type = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_request = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_term_outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payment_request_outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reconcile_effect_on = models.DateField(null=True, blank=True)
    advance_voucher_type = models.CharField(max_length=140, blank=True, null=True, default='')
    advance_voucher_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
