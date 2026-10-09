from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetMaintenanceGenerated(FrappeModel):
    doctype = 'Asset Maintenance'
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_category = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_team = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_manager = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_manager_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
