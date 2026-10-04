from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SubcontractingOrderSuppliedItemGenerated(FrappeChildModel):
    doctype = 'Subcontracting Order Supplied Item'
    main_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    rm_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserve_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    bom_detail_no = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    required_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    supplied_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    consumed_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    returned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_supplied_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
