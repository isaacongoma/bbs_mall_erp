from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PaymentReferenceGenerated(FrappeChildModel):
    doctype = 'Payment Reference'
    payment_term = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_schedule = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
