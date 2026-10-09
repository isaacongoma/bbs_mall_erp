from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AttendanceRequestGenerated(FrappeModel):
    doctype = 'Attendance Request'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    half_day = models.SmallIntegerField(default=0)
    half_day_date = models.DateField(null=True, blank=True)
    reason = models.CharField(max_length=140, blank=True, null=True, default='')
    explanation = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    shift = models.CharField(max_length=140, blank=True, null=True, default='')
    include_holidays = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
