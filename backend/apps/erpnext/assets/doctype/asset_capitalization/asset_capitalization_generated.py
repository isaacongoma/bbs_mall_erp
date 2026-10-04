from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetCapitalizationGenerated(FrappeModel):
    doctype = 'Asset Capitalization'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    target_item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    target_asset = models.CharField(max_length=140, blank=True, null=True, default='')
    target_asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    posting_date = models.DateField(null=True, blank=True)
    posting_time = models.TimeField(null=True, blank=True)
    set_posting_time = models.SmallIntegerField(default=0)
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    stock_items_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    asset_items_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    service_items_total = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_value = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    target_incoming_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    target_fixed_asset_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
