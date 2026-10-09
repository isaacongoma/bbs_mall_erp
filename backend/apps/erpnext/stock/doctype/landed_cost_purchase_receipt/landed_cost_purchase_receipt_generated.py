from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LandedCostPurchaseReceiptGenerated(FrappeChildModel):
    doctype = 'Landed Cost Purchase Receipt'
    receipt_document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    receipt_document = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
