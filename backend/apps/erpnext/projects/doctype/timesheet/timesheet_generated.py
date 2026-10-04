from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class TimesheetGenerated(FrappeModel):
    doctype = 'Timesheet'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    sales_invoice = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Draft')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    total_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billable_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billed_hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_billed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    per_billed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    note = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_project = models.CharField(max_length=140, blank=True, null=True, default='')
    customer = models.CharField(max_length=140, blank=True, null=True, default='')
    currency = models.CharField(max_length=140, blank=True, null=True, default='')
    base_total_costing_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_billable_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    base_total_billed_amount = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
