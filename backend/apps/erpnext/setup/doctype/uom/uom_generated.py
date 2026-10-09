from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class UomGenerated(FrappeModel):
    doctype = 'UOM'
    uom_name = models.CharField(max_length=140, blank=True, null=True, default='')
    must_be_whole_number = models.SmallIntegerField(default=0)
    enabled = models.SmallIntegerField(default=1)
    symbol = models.CharField(max_length=140, blank=True, null=True, default='')
    common_code = models.CharField(max_length=3, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    category = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
