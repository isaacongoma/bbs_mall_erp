from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ShiftScheduleAssignmentGenerated(FrappeModel):
    doctype = 'Shift Schedule Assignment'
    enabled = models.SmallIntegerField(default=1)
    create_shifts_after = models.DateField(null=True, blank=True)
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_status = models.CharField(max_length=140, blank=True, null=True, default='Active')
    shift_schedule = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_location = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
