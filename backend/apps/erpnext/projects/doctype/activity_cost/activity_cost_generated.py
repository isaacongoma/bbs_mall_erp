from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class ActivityCostGenerated(FrappeModel):
    doctype = 'Activity Cost'
    activity_type = models.CharField(max_length=140, blank=True, null=True, default='')
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    billing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    costing_rate = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    title = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
