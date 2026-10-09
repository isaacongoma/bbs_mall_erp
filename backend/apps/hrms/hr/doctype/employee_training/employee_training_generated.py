from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmployeeTrainingGenerated(FrappeChildModel):
    doctype = 'Employee Training'
    training = models.CharField(max_length=140, blank=True, null=True, default='')
    training_date = models.DateField(null=True, blank=True)

    class Meta:
        abstract = True
