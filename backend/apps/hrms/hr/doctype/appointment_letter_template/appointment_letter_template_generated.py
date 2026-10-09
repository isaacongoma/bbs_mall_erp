from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppointmentLetterTemplateGenerated(FrappeModel):
    doctype = 'Appointment Letter Template'
    introduction = models.TextField(blank=True, null=True, default='')
    closing_notes = models.TextField(blank=True, null=True, default='')
    template_name = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
