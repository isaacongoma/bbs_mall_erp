from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetDepreciationScheduleGenerated(FrappeModel):
    doctype = 'Asset Depreciation Schedule'
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    finance_book = models.CharField(max_length=140, blank=True, null=True, default='')
    depreciation_method = models.CharField(max_length=140, blank=True, null=True, default='')
    rate_of_depreciation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_number_of_depreciations = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    frequency_of_depreciation = models.IntegerField(null=True, blank=True)
    expected_value_after_useful_life = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    finance_book_id = models.IntegerField(null=True, blank=True)
    opening_accumulated_depreciation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    opening_number_of_booked_depreciations = models.IntegerField(null=True, blank=True)
    daily_prorata_based = models.SmallIntegerField(default=0)
    shift_based = models.SmallIntegerField(default=0)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    value_after_depreciation = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    net_purchase_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
