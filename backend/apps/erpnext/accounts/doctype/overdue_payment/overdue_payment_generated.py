from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class OverduePaymentGenerated(FrappeChildModel):
    doctype = 'Overdue Payment'
    payment_term = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_portion = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payment_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discounted_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_schedule = models.CharField(max_length=140, blank=True, null=True, default='')
    overdue_days = models.CharField(max_length=140, blank=True, null=True, default='')
    dunning_level = models.IntegerField(null=True, blank=True)
    interest = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
