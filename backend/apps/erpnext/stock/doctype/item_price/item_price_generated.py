from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ItemPriceGenerated(FrappeModel):
    doctype = 'Item Price'
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    packing_unit = models.IntegerField(null=True, blank=True)
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    brand = models.CharField(max_length=140, blank=True, null=True, default='')
    item_description = models.TextField(blank=True, null=True, default='')
    price_list = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    buying = models.SmallIntegerField(default=0)
    selling = models.SmallIntegerField(default=0)
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    price_list_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    lead_time_days = models.IntegerField(null=True, blank=True)
    valid_upto = models.DateField(null=True, blank=True)
    note = models.TextField(blank=True, null=True, default='')
    reference = models.CharField(max_length=140, blank=True, null=True, default='')
    batch_no = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
