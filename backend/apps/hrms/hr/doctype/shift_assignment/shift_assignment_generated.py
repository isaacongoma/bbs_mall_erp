from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ShiftAssignmentGenerated(FrappeModel):
    doctype = 'Shift Assignment'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_type = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_request = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='Active')
    shift_location = models.CharField(max_length=140, blank=True, null=True, default='')
    shift_schedule_assignment = models.CharField(max_length=140, blank=True, null=True, default='')
    overtime_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
