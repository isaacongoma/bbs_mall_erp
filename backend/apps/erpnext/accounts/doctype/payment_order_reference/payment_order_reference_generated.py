from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentOrderReferenceGenerated(FrappeChildModel):
    doctype = 'Payment Order Reference'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_request = models.CharField(max_length=140, blank=True, null=True, default='')
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_reference = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
