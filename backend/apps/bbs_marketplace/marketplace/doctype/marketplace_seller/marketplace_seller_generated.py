from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceSellerGenerated(FrappeModel):
    doctype = 'Marketplace Seller'
    seller_name = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending Approval')
    seller_type = models.CharField(max_length=140, blank=True, null=True, default='Marketplace Seller')
    kyc_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    fulfilment_mode = models.CharField(max_length=140, blank=True, null=True, default='Seller Ships')
    shop_slug = models.CharField(max_length=140, blank=True, null=True, default='')
    logo = models.TextField(blank=True, null=True, default='')
    banner = models.TextField(blank=True, null=True, default='')
    tagline = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    contact_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    lease = models.CharField(max_length=140, blank=True, null=True, default='')
    holiday_mode = models.SmallIntegerField(default=0)
    kra_pin = models.CharField(max_length=140, blank=True, null=True, default='')
    vat_registered = models.SmallIntegerField(default=0)
    commission_override = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    return_policy = models.TextField(blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    ship_from_address = models.CharField(max_length=140, blank=True, null=True, default='')
    current_plan = models.CharField(max_length=140, blank=True, null=True, default='')
    plan_expires_on = models.DateField(null=True, blank=True)
    rating = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rating_count = models.IntegerField(null=True, blank=True)
    total_orders = models.IntegerField(null=True, blank=True)
    total_sales = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fulfilment_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cancel_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    return_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    wallet_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    pending_balance = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    approved_by = models.CharField(max_length=140, blank=True, null=True, default='')
    approved_on = FrappeDateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
