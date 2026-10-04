from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentGatewayAccountGenerated(FrappeModel):
    doctype = 'Payment Gateway Account'
    payment_gateway = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    payment_account = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='Please click on the link below to make your payment')
    payment_channel = models.CharField(max_length=140, blank=True, null=True, default='Email')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
