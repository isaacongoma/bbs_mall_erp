from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalarySlipTimesheetGenerated(FrappeChildModel):
    doctype = 'Salary Slip Timesheet'
    time_sheet = models.CharField(max_length=140, blank=True, null=True, default='')
    working_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
