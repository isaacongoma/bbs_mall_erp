from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SupplierNumberAtCustomerGenerated(FrappeChildModel):
    doctype = 'Supplier Number At Customer'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_number = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
