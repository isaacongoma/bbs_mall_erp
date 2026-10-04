from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetRepairGenerated(FrappeModel):
    doctype = 'Asset Repair'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    failure_date = models.DateTimeField(null=True, blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    repair_status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    description = models.TextField(blank=True, null=True, default='')
    actions_performed = models.TextField(blank=True, null=True, default='')
    downtime = models.CharField(max_length=140, blank=True, null=True, default='')
    repair_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    capitalize_repair_cost = models.SmallIntegerField(default=0)
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    total_repair_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    increase_in_asset_life = models.IntegerField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    consumed_items_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
