from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class BlanketOrderGenerated(FrappeModel):
    doctype = 'Blanket Order'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    blanket_order_type = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier_name = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    selling_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    buying_price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    price_list_currency = models.CharField(max_length=140, blank=True, null=True, default='')
    plc_conversion_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    tc_name = models.CharField(max_length=140, blank=True, null=True, default='')
    terms = models.TextField(blank=True, null=True, default='')
    order_no = models.CharField(max_length=140, blank=True, null=True, default='')
    order_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
