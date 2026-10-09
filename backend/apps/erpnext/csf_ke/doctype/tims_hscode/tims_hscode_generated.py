from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TimsHscodeGenerated(FrappeModel):
    doctype = 'TIMs HSCode'
    disabled = models.SmallIntegerField(default=0)
    tims_hscode = models.CharField(max_length=140, blank=True, null=True, default='')
    item_tax = models.CharField(max_length=140, blank=True, null=True, default='')
    uom = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
