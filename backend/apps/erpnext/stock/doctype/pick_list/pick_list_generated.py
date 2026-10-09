from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PickListGenerated(FrappeModel):
    doctype = 'Pick List'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    work_order = models.CharField(max_length=140, blank=True, null=True, default='')
    for_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    purpose = models.CharField(max_length=140, blank=True, null=True, default='Material Transfer for Manufacture')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    group_same_items = models.SmallIntegerField(default=0)
    scan_barcode = models.CharField(max_length=140, blank=True, null=True, default='')
    scan_mode = models.SmallIntegerField(default=0)
    prompt_qty = models.SmallIntegerField(default=0)
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    consider_rejected_warehouses = models.SmallIntegerField(default=0)
    pick_manually = models.SmallIntegerField(default=0)
    ignore_pricing_rule = models.SmallIntegerField(default=0)
    delivery_status = models.CharField(max_length=140, blank=True, null=True, default='')
    per_delivered = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
