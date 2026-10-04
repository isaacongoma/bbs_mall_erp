from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingInwardOrderReceivedItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Inward Order Received Item'
    main_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    rm_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    received_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    work_order_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_customer_provided_item = models.SmallIntegerField(default=0)
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    billed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_additional_item = models.SmallIntegerField(default=0)
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
