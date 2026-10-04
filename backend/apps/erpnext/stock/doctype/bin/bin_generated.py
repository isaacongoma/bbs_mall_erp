from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BinGenerated(FrappeModel):
    doctype = 'Bin'
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    reserved_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    ordered_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    indented_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    planned_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    projected_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_qty_for_production = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_qty_for_sub_contract = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    valuation_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_qty_for_production_plan = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reserved_stock = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
