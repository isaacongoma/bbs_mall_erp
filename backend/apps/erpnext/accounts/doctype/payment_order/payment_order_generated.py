from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentOrderGenerated(FrappeModel):
    doctype = 'Payment Order'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='PMO-')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_order_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company_bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    company_bank = models.CharField(max_length=140, blank=True, null=True, default='')
    account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
