from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SubscriptionInvoiceGenerated(FrappeChildModel):
    doctype = 'Subscription Invoice'
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
