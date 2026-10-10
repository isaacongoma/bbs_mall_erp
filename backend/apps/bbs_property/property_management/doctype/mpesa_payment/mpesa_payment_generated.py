from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MpesaPaymentGenerated(FrappeModel):
    doctype = 'Mpesa Payment'
    transaction_id = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    payer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    account_reference = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_time = FrappeDateTimeField(null=True, blank=True)
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    result_description = models.TextField(blank=True, null=True, default='')
    checkout_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    merchant_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    raw_payload = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
