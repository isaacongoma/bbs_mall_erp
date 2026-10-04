from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetMaintenanceTaskGenerated(FrappeChildModel):
    doctype = 'Asset Maintenance Task'
    maintenance_task = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_type = models.CharField(max_length=140, blank=True, null=True, default='')
    maintenance_status = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    periodicity = models.CharField(max_length=140, blank=True, null=True, default='')
    end_date = models.DateField(null=True, blank=True)
    certificate_required = models.SmallIntegerField(default=0)
    assign_to = models.CharField(max_length=140, blank=True, null=True, default='')
    assign_to_name = models.CharField(max_length=140, blank=True, null=True, default='')
    next_due_date = models.DateField(null=True, blank=True)
    last_completion_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
