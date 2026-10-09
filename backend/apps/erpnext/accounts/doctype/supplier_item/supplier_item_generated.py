from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SupplierItemGenerated(FrappeChildModel):
    doctype = 'Supplier Item'
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
