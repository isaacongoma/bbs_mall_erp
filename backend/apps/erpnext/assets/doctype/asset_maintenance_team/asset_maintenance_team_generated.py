from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetMaintenanceTeamGenerated(FrappeModel):
    doctype = 'Asset Maintenance Team'
    maintenance_team_name = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_manager = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_manager_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
