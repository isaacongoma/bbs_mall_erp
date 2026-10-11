from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerPayoutAccountGenerated(FrappeChildModel):
    doctype = 'Seller Payout Account'
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    account_label = models.CharField(max_length=140, blank=True, null=True, default='')
    mpesa_number = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    account_holder = models.CharField(max_length=140, blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)
    verified = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
