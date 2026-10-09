from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ItemManufacturerGenerated(FrappeModel):
    doctype = 'Item Manufacturer'
    manufacturer = models.CharField(max_length=140, blank=True, null=True, default='')
    manufacturer_part_no = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    is_default = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
