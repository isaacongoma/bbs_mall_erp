from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetFinanceBookGenerated(FrappeChildModel):
    doctype = 'Asset Finance Book'
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    depreciation_method = models.CharField(max_length=140, blank=True, null=True, default='')
    total_number_of_depreciations = models.IntegerField(null=True, blank=True)
    frequency_of_depreciation = models.IntegerField(null=True, blank=True)
    depreciation_start_date = models.DateField(null=True, blank=True)
    expected_value_after_useful_life = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    value_after_depreciation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    rate_of_depreciation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    salvage_value_percentage = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    daily_prorata_based = models.SmallIntegerField(default=0)
    shift_based = models.SmallIntegerField(default=0)
    total_number_of_booked_depreciations = models.IntegerField(null=True, blank=True)
    increase_in_asset_life = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
