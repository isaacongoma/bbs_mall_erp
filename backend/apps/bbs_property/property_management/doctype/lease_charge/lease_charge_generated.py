from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaseChargeGenerated(FrappeChildModel):
    doctype = 'Lease Charge'
    charge_item = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    frequency = models.CharField(max_length=140, blank=True, null=True, default='Monthly')
    escalates = models.SmallIntegerField(default=0)
    one_off_billed = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
