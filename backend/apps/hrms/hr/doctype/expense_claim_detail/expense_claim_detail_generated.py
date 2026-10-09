from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseClaimDetailGenerated(FrappeChildModel):
    doctype = 'Expense Claim Detail'
    expense_date = models.DateField(null=True, blank=True)
    expense_type = models.CharField(max_length=140, blank=True, null=True, default='')
    default_account = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sanctioned_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_sanctioned_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
