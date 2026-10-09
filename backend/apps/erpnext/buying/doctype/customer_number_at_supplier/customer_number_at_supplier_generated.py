from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomerNumberAtSupplierGenerated(FrappeChildModel):
    doctype = 'Customer Number At Supplier'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_number = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
