from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeCheckinGenerated(FrappeModel):
    doctype = 'Employee Checkin'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    log_type = models.CharField(max_length=140, blank=True, null=True, default='')
    shift = models.CharField(max_length=140, blank=True, null=True, default='')
    time = FrappeDateTimeField(null=True, blank=True)
    device_id = models.CharField(max_length=140, blank=True, null=True, default='')
    skip_auto_attendance = models.SmallIntegerField(default=0)
    attendance = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_start = FrappeDateTimeField(null=True, blank=True)
    shift_end = FrappeDateTimeField(null=True, blank=True)
    shift_actual_start = FrappeDateTimeField(null=True, blank=True)
    shift_actual_end = FrappeDateTimeField(null=True, blank=True)
    geolocation = models.TextField(blank=True, null=True, default='')
    latitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    longitude = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    offshift = models.SmallIntegerField(default=0)
    overtime_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
