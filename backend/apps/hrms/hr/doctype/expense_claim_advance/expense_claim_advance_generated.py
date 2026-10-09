from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseClaimAdvanceGenerated(FrappeChildModel):
    doctype = 'Expense Claim Advance'
    employee_advance = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    advance_paid = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    unclaimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    advance_account = models.CharField(max_length=140, blank=True, null=True, default='')
    return_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_advance_paid = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_unclaimed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_allocated_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_gain_loss = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payment_entry_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_type = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
