from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackingListSalesInvoiceGenerated(FrappeChildModel):
    doctype = 'Packing List Sales Invoice'
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice_date = models.DateField(null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_total_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
