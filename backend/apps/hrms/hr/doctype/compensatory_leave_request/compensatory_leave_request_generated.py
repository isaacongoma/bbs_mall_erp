from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CompensatoryLeaveRequestGenerated(FrappeModel):
    doctype = 'Compensatory Leave Request'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_allocation = models.CharField(max_length=140, blank=True, null=True, default='')
    work_from_date = models.DateField(null=True, blank=True)
    work_end_date = models.DateField(null=True, blank=True)
    half_day = models.SmallIntegerField(default=0)
    half_day_date = models.DateField(null=True, blank=True)
    reason = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
