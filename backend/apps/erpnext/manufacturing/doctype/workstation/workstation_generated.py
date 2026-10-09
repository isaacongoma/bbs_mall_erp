from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkstationGenerated(FrappeModel):
    doctype = 'Workstation'
    workstation_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    hour_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    holiday_list = models.CharField(max_length=140, blank=True, null=True, default='')
    production_capacity = models.IntegerField(null=True, blank=True)
    workstation_type = models.CharField(max_length=140, blank=True, null=True, default='')
    plant_floor = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    on_status_image = models.TextField(blank=True, null=True, default='')
    off_status_image = models.TextField(blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    total_working_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    disabled = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
