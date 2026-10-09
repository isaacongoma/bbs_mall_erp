from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetShiftAllocationGenerated(FrappeModel):
    doctype = 'Asset Shift Allocation'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
