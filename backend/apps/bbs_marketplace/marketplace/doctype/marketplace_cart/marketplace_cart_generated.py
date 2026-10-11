from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceCartGenerated(FrappeModel):
    doctype = 'Marketplace Cart'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='CART-.YYYY.-')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    session_key = models.CharField(max_length=140, blank=True, null=True, default='')
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='B2C')
    status = models.CharField(max_length=140, blank=True, null=True, default='Active')
    coupon_code = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_zone = models.CharField(max_length=140, blank=True, null=True, default='')
    subtotal = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    last_activity = FrappeDateTimeField(null=True, blank=True)
    reminder_count = models.IntegerField(null=True, blank=True)
    last_reminder_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
