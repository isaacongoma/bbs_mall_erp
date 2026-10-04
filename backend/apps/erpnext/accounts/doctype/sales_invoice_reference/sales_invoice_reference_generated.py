from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SalesInvoiceReferenceGenerated(FrappeChildModel):
    doctype = 'Sales Invoice Reference'
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    is_return = models.SmallIntegerField(default=0)
    return_against = models.CharField(max_length=140, blank=True, null=True, default='')
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
