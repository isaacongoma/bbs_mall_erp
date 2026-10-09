from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AppointmentGenerated(FrappeModel):
    doctype = 'Appointment'
    customer_name = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_phone_number = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_skype = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_details = models.TextField(blank=True, null=True, default='')
    scheduled_time = FrappeDateTimeField(null=True, blank=True)
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    calendar_event = models.CharField(max_length=140, blank=True, null=True, default='')
    customer_email = models.CharField(max_length=140, blank=True, null=True, default='')
    appointment_with = models.CharField(max_length=140, blank=True, null=True, default='')
    party = models.CharField(max_length=140, blank=True, null=True, default='')
    created_through_portal = models.SmallIntegerField(default=0)
    email_verified = models.SmallIntegerField(default=0)
    verification_token = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
