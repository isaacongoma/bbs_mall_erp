from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TrainingEventGenerated(FrappeModel):
    doctype = 'Training Event'
    event_name = models.CharField(max_length=140, blank=True, null=True, default='')
    training_program = models.CharField(max_length=140, blank=True, null=True, default='')
    event_status = models.CharField(max_length=140, blank=True, null=True, default='')
    has_certificate = models.SmallIntegerField(default=0)
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    level = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    trainer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    trainer_email = models.CharField(max_length=140, blank=True, null=True, default='')
    supplier = models.CharField(max_length=140, blank=True, null=True, default='')
    contact_number = models.CharField(max_length=140, blank=True, null=True, default='')
    course = models.CharField(max_length=140, blank=True, null=True, default='')
    location = models.CharField(max_length=140, blank=True, null=True, default='')
    start_time = FrappeDateTimeField(null=True, blank=True)
    end_time = FrappeDateTimeField(null=True, blank=True)
    introduction = models.TextField(blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')
    employee_emails = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
