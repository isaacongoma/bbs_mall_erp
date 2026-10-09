from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShipmentGenerated(FrappeModel):
    doctype = 'Shipment'
    pickup_from_type = models.CharField(max_length=140, blank=True, null=True, default='Company')
    pickup_company = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_customer = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_address_name = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_address = models.TextField(blank=True, null=True, default='')
    pickup_contact_name = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_contact = models.TextField(blank=True, null=True, default='')
    delivery_to_type = models.CharField(max_length=140, blank=True, null=True, default='Customer')
    delivery_company = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_customer = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_to = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_address_name = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_address = models.TextField(blank=True, null=True, default='')
    delivery_contact_name = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_contact_email = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_contact = models.TextField(blank=True, null=True, default='')
    parcel_template = models.CharField(max_length=140, blank=True, null=True, default='')
    pallets = models.CharField(max_length=140, blank=True, null=True, default='No')
    value_of_goods = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    pickup_date = models.DateField(null=True, blank=True)
    pickup_from = FrappeTimeField(null=True, blank=True)
    pickup_to = FrappeTimeField(null=True, blank=True)
    shipment_type = models.CharField(max_length=140, blank=True, null=True, default='Goods')
    pickup_type = models.CharField(max_length=140, blank=True, null=True, default='Pickup')
    description_of_content = models.TextField(blank=True, null=True, default='')
    service_provider = models.CharField(max_length=140, blank=True, null=True, default='')
    shipment_id = models.CharField(max_length=140, blank=True, null=True, default='')
    shipment_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    tracking_url = models.TextField(blank=True, null=True, default='')
    carrier = models.CharField(max_length=140, blank=True, null=True, default='')
    carrier_service = models.CharField(max_length=140, blank=True, null=True, default='')
    awb_number = models.CharField(max_length=140, blank=True, null=True, default='')
    tracking_status = models.CharField(max_length=140, blank=True, null=True, default='')
    tracking_status_info = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    incoterm = models.CharField(max_length=140, blank=True, null=True, default='')
    pickup_contact_person = models.CharField(max_length=140, blank=True, null=True, default='')
    total_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
