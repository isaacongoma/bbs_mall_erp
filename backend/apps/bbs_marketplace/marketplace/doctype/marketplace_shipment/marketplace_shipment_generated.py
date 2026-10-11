from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class MarketplaceShipmentGenerated(FrappeModel):
    doctype = 'Marketplace Shipment'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='SHP-.YYYY.-')
    seller_order = models.CharField(max_length=140, blank=True, null=True, default='')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    courier = models.CharField(max_length=140, blank=True, null=True, default='')
    service_level = models.CharField(max_length=140, blank=True, null=True, default='Standard')
    tracking_no = models.CharField(max_length=140, blank=True, null=True, default='')
    parcels = models.IntegerField(null=True, blank=True)
    weight_kg = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    declared_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cod_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cod_collected = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cod_remitted = models.SmallIntegerField(default=0)
    pickup_address = models.TextField(blank=True, null=True, default='')
    pickup_station = models.CharField(max_length=140, blank=True, null=True, default='')
    recipient_name = models.CharField(max_length=140, blank=True, null=True, default='')
    recipient_phone = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_address = models.TextField(blank=True, null=True, default='')
    customer_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    courier_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    purchase_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_note = models.CharField(max_length=140, blank=True, null=True, default='')
    scheduled_pickup = FrappeDateTimeField(null=True, blank=True)
    picked_up_on = FrappeDateTimeField(null=True, blank=True)
    delivered_on = FrappeDateTimeField(null=True, blank=True)
    proof_of_delivery = models.TextField(blank=True, null=True, default='')
    delivery_otp = models.CharField(max_length=140, blank=True, null=True, default='')
    failure_reason = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
