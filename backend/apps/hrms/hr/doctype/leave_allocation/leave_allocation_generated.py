from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class LeaveAllocationGenerated(FrappeModel):
    doctype = 'Leave Allocation'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    new_leaves_allocated = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    carry_forward = models.SmallIntegerField(default=0)
    unused_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_leaves_allocated = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    total_leaves_encashed = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    compensatory_request = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_period = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_policy = models.CharField(max_length=140, blank=True, null=True, default='')
    expired = models.SmallIntegerField(default=0)
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    carry_forwarded_leaves_count = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    leave_policy_assignment = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
