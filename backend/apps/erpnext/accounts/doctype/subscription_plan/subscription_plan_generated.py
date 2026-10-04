from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubscriptionPlanGenerated(FrappeModel):
    doctype = 'Subscription Plan'
    plan_name = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    item = models.CharField(max_length=140, blank=True, null=True, default='')
    price_determination = models.CharField(max_length=140, blank=True, null=True, default='')
    cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_interval = models.CharField(max_length=140, blank=True, null=True, default='Day')
    billing_interval_count = models.IntegerField(null=True, blank=True)
    payment_gateway = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    product_price_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
