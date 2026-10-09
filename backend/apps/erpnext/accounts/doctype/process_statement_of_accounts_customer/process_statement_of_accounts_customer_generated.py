from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessStatementOfAccountsCustomerGenerated(FrappeChildModel):
    doctype = 'Process Statement Of Accounts Customer'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    primary_email = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_email = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
