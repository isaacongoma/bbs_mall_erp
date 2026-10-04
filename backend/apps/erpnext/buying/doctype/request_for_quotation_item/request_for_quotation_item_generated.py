from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class RequestForQuotationItemGenerated(FrappeChildModel):
    doctype = 'Request for Quotation Item'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_part_no = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    image = models.TextField(blank=True, null=True, default='')
    qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    schedule_date = models.DateField(null=True, blank=True)
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    project_name = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request = models.CharField(max_length=140, blank=True, null=True, default='')
    material_request_item = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    item_group = models.CharField(max_length=140, blank=True, null=True, default='')
    page_break = models.SmallIntegerField(default=0)
    stock_uom = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_factor = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    stock_qty = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
