from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TrainingResultEmployeeGenerated(FrappeChildModel):
    doctype = 'Training Result Employee'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    hours = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    grade = models.CharField(max_length=140, blank=True, null=True, default='')
    comments = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
