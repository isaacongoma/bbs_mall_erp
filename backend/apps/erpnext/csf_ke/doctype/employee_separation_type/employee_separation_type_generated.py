from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeSeparationTypeGenerated(FrappeModel):
    doctype = 'Employee Separation Type'
    naming_series = models.CharField(max_length=140, blank=True, null=True, default='')
    separation_type = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
