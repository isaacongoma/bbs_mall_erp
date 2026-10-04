from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetValueAdjustmentGenerated(FrappeModel):
    doctype = 'Asset Value Adjustment'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_category = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    journal_entry = models.CharField(max_length=140, blank=True, null=True, default='')
    date = models.DateField(null=True, blank=True)
    current_asset_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    new_asset_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    difference_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    difference_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
