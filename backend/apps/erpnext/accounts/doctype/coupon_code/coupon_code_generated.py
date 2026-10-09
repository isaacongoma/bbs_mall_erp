from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CouponCodeGenerated(FrappeModel):
    doctype = 'Coupon Code'
    coupon_name = models.CharField(max_length=140, blank=True, null=True, default='')
    coupon_type = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    coupon_code = models.CharField(max_length=140, blank=True, null=True, default='')
    pricing_rule = models.CharField(max_length=140, blank=True, null=True, default='')
    valid_from = models.DateField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)
    maximum_use = models.IntegerField(null=True, blank=True)
    used = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    from_external_ecomm_platform = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
