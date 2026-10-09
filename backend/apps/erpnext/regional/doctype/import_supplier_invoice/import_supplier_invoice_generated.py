from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ImportSupplierInvoiceGenerated(FrappeModel):
    doctype = 'Import Supplier Invoice'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_group = models.CharField(max_length=140, blank=True, null=True, default='')
    tax_account = models.CharField(max_length=140, blank=True, null=True, default='')
    zip_file = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_series = models.CharField(max_length=140, blank=True, null=True, default='')
    default_buying_price_list = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
