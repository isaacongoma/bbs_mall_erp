from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LandedCostVendorInvoiceGenerated(FrappeChildModel):
    doctype = 'Landed Cost Vendor Invoice'
    vendor_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
