from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ModeOfPaymentAccountGenerated(FrappeChildModel):
    doctype = 'Mode of Payment Account'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    default_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
