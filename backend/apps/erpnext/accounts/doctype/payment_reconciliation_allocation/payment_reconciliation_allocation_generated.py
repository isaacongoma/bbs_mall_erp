from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentReconciliationAllocationGenerated(FrappeChildModel):
    doctype = 'Payment Reconciliation Allocation'
    invoice_number = models.CharField(max_length=140, blank=True, null=True, default='')
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    difference_account = models.CharField(max_length=140, blank=True, null=True, default='')
    difference_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    is_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_type = models.CharField(max_length=140, blank=True, null=True, default='')
    unreconciled_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reference_row = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    gain_loss_posting_date = models.DateField(null=True, blank=True)
    debit_or_credit_note_posting_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
