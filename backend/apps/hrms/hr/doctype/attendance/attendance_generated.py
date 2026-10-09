from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AttendanceGenerated(FrappeModel):
    doctype = 'Attendance'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    working_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Present')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_application = models.CharField(max_length=140, blank=True, null=True, default='')
    attendance_date = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    shift = models.CharField(max_length=140, blank=True, null=True, default='')
    attendance_request = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    late_entry = models.SmallIntegerField(default=0)
    early_exit = models.SmallIntegerField(default=0)
    in_time = FrappeDateTimeField(null=True, blank=True)
    out_time = FrappeDateTimeField(null=True, blank=True)
    half_day_status = models.CharField(max_length=140, blank=True, null=True, default='')
    modify_half_day_status = models.SmallIntegerField(default=0)
    overtime_type = models.CharField(max_length=140, blank=True, null=True, default='')
    standard_working_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    actual_overtime_duration = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
