from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeGroupTableGenerated(FrappeChildModel):
    doctype = 'Employee Group Table'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    user_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
