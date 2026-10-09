from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class SmsLogGenerated(FrappeModel):
    doctype = 'SMS Log'
    sender_name = models.CharField(max_length=140, blank=True, null=True, default='')
    sent_on = models.DateField(null=True, blank=True)
    message = models.TextField(blank=True, null=True, default='')
    no_of_requested_sms = models.IntegerField(null=True, blank=True)
    requested_numbers = models.TextField(blank=True, null=True, default='')
    no_of_sent_sms = models.IntegerField(null=True, blank=True)
    sent_to = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
