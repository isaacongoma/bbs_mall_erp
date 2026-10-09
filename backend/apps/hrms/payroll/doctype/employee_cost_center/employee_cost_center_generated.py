from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeCostCenterGenerated(FrappeChildModel):
    doctype = 'Employee Cost Center'
    cost_center = models.CharField(max_length=140, blank=True, null=True, default='')
    percentage = models.IntegerField(null=True, blank=True)

    class Meta:
        abstract = True
