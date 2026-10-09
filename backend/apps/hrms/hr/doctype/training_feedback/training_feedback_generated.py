from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TrainingFeedbackGenerated(FrappeModel):
    doctype = 'Training Feedback'
    employee = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_name = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    course = models.CharField(max_length=140, blank=True, null=True, default='')
    training_event = models.CharField(max_length=140, blank=True, null=True, default='')
    event_name = models.CharField(max_length=140, blank=True, null=True, default='')
    trainer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    feedback = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
