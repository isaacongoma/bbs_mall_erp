from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetMaintenanceLogGenerated(FrappeModel):
    doctype = 'Asset Maintenance Log'
    asset_maintenance = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    item_code = models.CharField(max_length=140, blank=True, null=True, default='')
    item_name = models.CharField(max_length=140, blank=True, null=True, default='')
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_type = models.CharField(max_length=140, blank=True, null=True, default='')
    periodicity = models.CharField(max_length=140, blank=True, null=True, default='')
    assign_to_name = models.CharField(max_length=140, blank=True, null=True, default='')
    due_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    maintenance_status = models.CharField(max_length=140, blank=True, null=True, default='')
    has_certificate = models.SmallIntegerField(default=0)
    certificate_attachement = models.TextField(blank=True, null=True, default='')
    description = models.CharField(max_length=140, blank=True, null=True, default='')
    actions_performed = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    task_name = models.CharField(max_length=140, blank=True, null=True, default='')
    task_assignee_email = models.CharField(max_length=140, blank=True, null=True, default='')
    _seen = models.TextField(null=True, blank=True)

    class Meta:
        abstract = True
