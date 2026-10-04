from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentScheduleGenerated(FrappeChildModel):
    doctype = 'Payment Schedule'
    payment_term = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    invoice_portion = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    payment_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discounted_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_date = models.DateField(null=True, blank=True)
    discount_type = models.CharField(max_length=140, blank=True, null=True, default='Percentage')
    discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_payment_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_outstanding = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    due_date_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    credit_days = models.IntegerField(null=True, blank=True)
    credit_months = models.IntegerField(null=True, blank=True)
    discount_validity_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    discount_validity = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
