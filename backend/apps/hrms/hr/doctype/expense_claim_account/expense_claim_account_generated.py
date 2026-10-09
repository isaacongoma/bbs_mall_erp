from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseClaimAccountGenerated(FrappeChildModel):
    doctype = 'Expense Claim Account'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    default_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
