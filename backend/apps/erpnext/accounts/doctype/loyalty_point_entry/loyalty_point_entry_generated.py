from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LoyaltyPointEntryGenerated(FrappeModel):
    doctype = 'Loyalty Point Entry'
    loyalty_program = models.CharField(max_length=140, blank=True, null=True, default='')
    loyalty_program_tier = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    redeem_against = models.CharField(max_length=140, blank=True, null=True, default='')
    loyalty_points = models.IntegerField(null=True, blank=True)
    purchase_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_type = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    discretionary_reason = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
