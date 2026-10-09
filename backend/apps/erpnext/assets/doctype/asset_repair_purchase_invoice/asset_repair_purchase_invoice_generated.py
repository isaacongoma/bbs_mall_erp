from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetRepairPurchaseInvoiceGenerated(FrappeChildModel):
    doctype = 'Asset Repair Purchase Invoice'
    purchase_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    repair_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
