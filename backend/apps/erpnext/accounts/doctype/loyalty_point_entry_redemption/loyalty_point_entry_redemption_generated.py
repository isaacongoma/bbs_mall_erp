from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LoyaltyPointEntryRedemptionGenerated(FrappeChildModel):
    doctype = 'Loyalty Point Entry Redemption'
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    redemption_date = models.DateField(null=True, blank=True)
    redeemed_points = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
