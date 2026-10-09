from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EarnedLeaveScheduleGenerated(FrappeChildModel):
    doctype = 'Earned Leave Schedule'
    allocation_date = models.DateField(null=True, blank=True)
    number_of_leaves = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_allocated = models.SmallIntegerField(default=0)
    failure_reason = models.TextField(blank=True, null=True, default='')
    allocated_via = models.CharField(max_length=140, blank=True, null=True, default='')
    attempted = models.SmallIntegerField(default=0)
    failed = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
