from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeBoardingActivityGenerated(FrappeChildModel):
    doctype = 'Employee Boarding Activity'
    activity_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    role = models.CharField(max_length=140, blank=True, null=True, default='')
    task = models.CharField(max_length=140, blank=True, null=True, default='')
    task_weight = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    required_for_employee_creation = models.SmallIntegerField(default=0)
    description = models.TextField(blank=True, null=True, default='')
    duration = models.IntegerField(null=True, blank=True)
    begin_on = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
