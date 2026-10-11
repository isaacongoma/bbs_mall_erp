from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SellerOrderGenerated(FrappeModel):
    doctype = 'Seller Order'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='SOR-.YYYY.-')
    marketplace_order = models.CharField(max_length=140, blank=True, null=True, default='')
    seller = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    buyer_type = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='New')
    settlement_status = models.CharField(max_length=140, blank=True, null=True, default='Unsettled')
    fulfilment_mode = models.CharField(max_length=140, blank=True, null=True, default='')
    sla_due = FrappeDateTimeField(null=True, blank=True)
    items_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    vat_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    seller_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    platform_discount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    shipping_fee = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    commission_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    commission_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    commission_vat = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    seller_net = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    settle_on = models.DateField(null=True, blank=True)
    settled_on = FrappeDateTimeField(null=True, blank=True)
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    reversal_journal = models.CharField(max_length=140, blank=True, null=True, default='')
    wallet_transaction = models.CharField(max_length=140, blank=True, null=True, default='')
    courier = models.CharField(max_length=140, blank=True, null=True, default='')
    shipment = models.CharField(max_length=140, blank=True, null=True, default='')
    accepted_on = FrappeDateTimeField(null=True, blank=True)
    packed_on = FrappeDateTimeField(null=True, blank=True)
    shipped_on = FrappeDateTimeField(null=True, blank=True)
    delivered_on = FrappeDateTimeField(null=True, blank=True)
    cancel_reason = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
