from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeaveAdjustmentGenerated(FrappeModel):
    doctype = 'Leave Adjustment'
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_allocation = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    to_date = models.DateField(null=True, blank=True)
    allocated_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    posting_date = models.DateField(null=True, blank=True)
    leaves_to_adjust = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    adjustment_type = models.CharField(max_length=140, blank=True, null=True, default='')
    leaves_after_adjustment = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    reason_for_adjustment = models.TextField(blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
