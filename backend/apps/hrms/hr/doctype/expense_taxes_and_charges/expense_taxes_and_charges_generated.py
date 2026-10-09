from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ExpenseTaxesAndChargesGenerated(FrappeChildModel):
    doctype = 'Expense Taxes and Charges'
    account_head = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default=':Company')
    description = models.TextField(blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    base_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
