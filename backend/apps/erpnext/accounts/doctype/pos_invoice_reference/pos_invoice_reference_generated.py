from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PosInvoiceReferenceGenerated(FrappeChildModel):
    doctype = 'POS Invoice Reference'
    pos_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_return = models.SmallIntegerField(default=0)
    return_against = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
