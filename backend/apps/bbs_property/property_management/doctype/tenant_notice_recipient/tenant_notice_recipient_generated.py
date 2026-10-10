from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TenantNoticeRecipientGenerated(FrappeChildModel):
    doctype = 'Tenant Notice Recipient'
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
