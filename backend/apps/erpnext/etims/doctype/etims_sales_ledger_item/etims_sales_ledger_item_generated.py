from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsSalesLedgerItemGenerated(FrappeChildModel):
    doctype = 'eTIMS Sales Ledger Item'
    product_name = models.CharField(max_length=140, blank=True, null=True, default='')
    quantity = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_code = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_code_description = models.TextField(blank=True, null=True, default='')
    pricelist_name = models.CharField(max_length=140, blank=True, null=True, default='')
    gross_line_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    price_exclusive_tax = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    price_inclusive_tax = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    etims_tax_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_exclusive_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    tax_inclusive_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
