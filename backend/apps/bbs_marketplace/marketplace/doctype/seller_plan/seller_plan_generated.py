from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerPlanGenerated(FrappeModel):
    doctype = 'Seller Plan'
    plan_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=1)
    is_default = models.SmallIntegerField(default=0)
    monthly_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    annual_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    listing_limit = models.IntegerField(null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    featured_slots = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
