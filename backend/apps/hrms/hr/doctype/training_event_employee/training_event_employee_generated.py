from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TrainingEventEmployeeGenerated(FrappeChildModel):
    doctype = 'Training Event Employee'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Open')
    attendance = models.CharField(max_length=140, blank=True, null=True, default='')
    is_mandatory = models.SmallIntegerField(default=1)

    class Meta:
        abstract = True
