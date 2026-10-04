from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LandedCostTaxesAndChargesGenerated(FrappeChildModel):
    doctype = 'Landed Cost Taxes and Charges'
    description = models.TextField(blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    has_corrective_cost = models.SmallIntegerField(default=0)
    has_operating_cost = models.SmallIntegerField(default=0)
    operation_id = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    operating_component = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
