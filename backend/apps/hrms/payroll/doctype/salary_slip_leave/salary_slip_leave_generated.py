from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SalarySlipLeaveGenerated(FrappeChildModel):
    doctype = 'Salary Slip Leave'
    leave_type = models.CharField(max_length=140, blank=True, null=True, default='')
    total_allocated_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    expired_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    used_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    pending_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    available_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
