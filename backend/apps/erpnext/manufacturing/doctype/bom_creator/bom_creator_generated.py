from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BomCreatorGenerated(FrappeModel):
    doctype = 'BOM Creator'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    rm_cost_as_per = models.CharField(max_length=140, blank=True, null=True, default='Valuation Rate')
    buying_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    price_list_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    plc_conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    raw_material_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    remarks = models.TextField(blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    default_warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    set_rate_based_on_warehouse = models.SmallIntegerField(default=0)
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    error_log = models.TextField(blank=True, null=True, default='')
    routing = models.CharField(max_length=140, blank=True, null=True, default='')
    is_phantom = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
