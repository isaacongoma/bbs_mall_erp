from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EmailQueueGenerated(FrappeModel):
    doctype = 'Email Queue'
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    show_as_cc = models.TextField(blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Not Sent')
    error = models.TextField(blank=True, null=True, default='')
    message_id = models.TextField(blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    communication = models.CharField(max_length=140, blank=True, null=True, default='')
    send_after = FrappeDateTimeField(null=True, blank=True)
    priority = models.IntegerField(null=True, blank=True)
    add_unsubscribe_link = models.SmallIntegerField(default=1)
    unsubscribe_method = models.CharField(max_length=140, blank=True, null=True, default='')
    expose_recipients = models.CharField(max_length=140, blank=True, null=True, default='')
    attachments = models.TextField(blank=True, null=True, default='')
    retry = models.IntegerField(null=True, blank=True)
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    unsubscribe_params = models.TextField(blank=True, null=True, default='')
    raw_html = models.SmallIntegerField(default=0)
    redact_message_after_send = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
