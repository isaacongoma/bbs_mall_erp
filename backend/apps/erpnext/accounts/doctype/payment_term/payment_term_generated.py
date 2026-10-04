from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PaymentTermGenerated(FrappeModel):
    doctype = 'Payment Term'
    payment_term_name = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_portion = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    mode_of_payment = models.CharField(max_length=140, blank=True, null=True, default='')
    due_date_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    credit_days = models.IntegerField(null=True, blank=True)
    credit_months = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    discount_type = models.CharField(max_length=140, blank=True, null=True, default='Percentage')
    discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_validity_based_on = models.CharField(max_length=140, blank=True, null=True, default='Day(s) after invoice date')
    discount_validity = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
