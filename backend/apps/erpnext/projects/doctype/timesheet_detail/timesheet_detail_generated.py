from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TimesheetDetailGenerated(FrappeChildModel):
    doctype = 'Timesheet Detail'
    activity_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_time = FrappeDateTimeField(null=True, blank=True)
    expected_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    to_time = FrappeDateTimeField(null=True, blank=True)
    completed = models.SmallIntegerField(default=0)
    project = models.CharField(max_length=140, blank=True, null=True, default='')
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    billing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    billing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    costing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    is_billable = models.SmallIntegerField(default=0)
    project_name = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    base_billing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_billing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_costing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
