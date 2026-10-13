from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceOrderGenerated(FrappeModel):
    doctype = 'Marketplace Order'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='MKT-.YYYY.-')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='B2C')
    order_date = FrappeDateTimeField(null=True, blank=True)
    source = models.CharField(max_length=140, blank=True, null=True, default='Website')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending Payment')
    payment_status = models.CharField(max_length=140, blank=True, null=True, default='Unpaid')
    payment_method = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    recipient_name = models.CharField(max_length=140, blank=True, null=True, default='')
    recipient_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    shipping_address = models.CharField(max_length=140, blank=True, null=True, default='')
    address_snapshot = models.TextField(blank=True, null=True, default='')
    delivery_zone = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_method = models.CharField(max_length=140, blank=True, null=True, default='Courier Delivery')
    pickup_station = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_notes = models.TextField(blank=True, null=True, default='')
    subtotal = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    discount_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    shipping_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    shipping_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    grand_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    outstanding_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    coupon_code = models.CharField(max_length=140, blank=True, null=True, default='')
    platform_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    seller_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    purchase_order_no = models.CharField(max_length=140, blank=True, null=True, default='')
    payment_terms_template = models.CharField(max_length=140, blank=True, null=True, default='')
    kra_pin = models.CharField(max_length=140, blank=True, null=True, default='')
    business_name = models.CharField(max_length=140, blank=True, null=True, default='')
    invoice_required = models.SmallIntegerField(default=0)
    sales_order = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    cancel_reason = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
