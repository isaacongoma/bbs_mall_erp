from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseClaimTypeGenerated(FrappeModel):
    doctype = 'Expense Claim Type'
    expense_type = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    deferred_expense_account = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
