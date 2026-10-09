from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeePropertyHistoryGenerated(FrappeChildModel):
    doctype = 'Employee Property History'
    property = models.CharField(max_length=140, blank=True, null=True, default='')
    current = models.CharField(max_length=140, blank=True, null=True, default='')
    new = models.CharField(max_length=140, blank=True, null=True, default='')
    fieldname = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
