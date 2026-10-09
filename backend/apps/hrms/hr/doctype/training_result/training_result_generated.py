from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TrainingResultGenerated(FrappeModel):
    doctype = 'Training Result'
    training_event = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_emails = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
