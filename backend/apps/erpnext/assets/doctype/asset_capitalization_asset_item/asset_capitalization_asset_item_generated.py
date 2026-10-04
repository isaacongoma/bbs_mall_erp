from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetCapitalizationAssetItemGenerated(FrappeChildModel):
    doctype = 'Asset Capitalization Asset Item'
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    fixed_asset_account = models.CharField(max_length=140, blank=True, null=True, default='')
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    current_asset_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
