from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SalesInvoicePaymentGenerated(FrappeChildModel):
    doctype = 'Sales Invoice Payment'
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    base_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    clearance_date = models.DateField(null=True, blank=True)
    default = models.SmallIntegerField(default=0)
    reference_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
