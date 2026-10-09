from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankGenerated(FrappeModel):
    doctype = 'Bank'
    bank_name = models.CharField(max_length=140, blank=True, null=True, default='')
    swift_number = models.CharField(max_length=140, blank=True, null=True, default='')
    website = models.CharField(max_length=140, blank=True, null=True, default='')
    plaid_access_token = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
