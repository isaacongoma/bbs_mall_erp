from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetCategoryAccountGenerated(FrappeChildModel):
    doctype = 'Asset Category Account'
    company_name = models.CharField(max_length=140, blank=True, null=True, default='')
    fixed_asset_account = models.CharField(max_length=140, blank=True, null=True, default='')
    accumulated_depreciation_account = models.CharField(max_length=140, blank=True, null=True, default='')
    depreciation_expense_account = models.CharField(max_length=140, blank=True, null=True, default='')
    capital_work_in_progress_account = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
