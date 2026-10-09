from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LeavePolicyAssignmentGenerated(FrappeModel):
    doctype = 'Leave Policy Assignment'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_policy = models.CharField(max_length=140, blank=True, null=True, default='')
    assignment_based_on = models.CharField(max_length=140, blank=True, null=True, default='')
    leave_period = models.CharField(max_length=140, blank=True, null=True, default='')
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    carry_forward = models.SmallIntegerField(default=0)
    leaves_allocated = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
