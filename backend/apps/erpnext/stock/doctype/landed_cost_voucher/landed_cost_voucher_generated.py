from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LandedCostVoucherGenerated(FrappeModel):
    doctype = 'Landed Cost Voucher'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    total_taxes_and_charges = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    distribute_charges_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    total_vendor_invoices_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
