from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalesInvoiceTimesheetGenerated(FrappeChildModel):
    doctype = 'Sales Invoice Timesheet'
    time_sheet = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    billing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    timesheet_detail = models.CharField(max_length=140, blank=True, null=True, default='')
    activity_type = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    from_time = FrappeDateTimeField(null=True, blank=True)
    to_time = FrappeDateTimeField(null=True, blank=True)
    project_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
