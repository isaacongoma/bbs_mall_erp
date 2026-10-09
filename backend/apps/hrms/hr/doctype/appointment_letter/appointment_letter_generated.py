from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppointmentLetterGenerated(FrappeModel):
    doctype = 'Appointment Letter'
    applicant_name = models.CharField(max_length=140, blank=True, null=True, default='')
    appointment_date = models.DateField(null=True, blank=True)
    appointment_letter_template = models.CharField(max_length=140, blank=True, null=True, default='')
    introduction = models.TextField(blank=True, null=True, default='')
    job_applicant = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    closing_notes = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
