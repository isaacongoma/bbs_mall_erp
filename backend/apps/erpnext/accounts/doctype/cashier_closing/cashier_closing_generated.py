from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CashierClosingGenerated(FrappeModel):
    doctype = 'Cashier Closing'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='POS-CLO-')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    from_time = FrappeTimeField(null=True, blank=True)
    time = FrappeTimeField(null=True, blank=True)
    expense = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    custody = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returns = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
