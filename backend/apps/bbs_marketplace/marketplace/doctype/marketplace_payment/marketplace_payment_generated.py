from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplacePaymentGenerated(FrappeModel):
    doctype = 'Marketplace Payment'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='MPAY-.YYYY.-')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Initiated')
    phone = models.CharField(max_length=140, blank=True, null=True, default='')
    paid_on = FrappeDateTimeField(null=True, blank=True)
    merchant_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    checkout_request_id = models.CharField(max_length=140, blank=True, null=True, default='')
    gateway_receipt = models.CharField(max_length=140, blank=True, null=True, default='')
    fee_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    failure_reason = models.TextField(blank=True, null=True, default='')
    payment_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    request_payload = models.TextField(blank=True, null=True, default='')
    response_payload = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
