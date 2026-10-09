from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetCategoryGenerated(FrappeModel):
    doctype = 'Asset Category'
    asset_category_name = models.CharField(max_length=140, blank=True, null=True, default='')
    enable_cwip_accounting = models.SmallIntegerField(default=0)
    non_depreciable_category = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
