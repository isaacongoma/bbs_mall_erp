from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ProcessSubscriptionGenerated(FrappeModel):
    doctype = 'Process Subscription'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    subscription = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
