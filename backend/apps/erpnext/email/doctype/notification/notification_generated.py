from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class NotificationGenerated(FrappeModel):
    doctype = 'Notification'
    enabled = models.SmallIntegerField(default=1)
    channel = models.CharField(max_length=140, blank=True, null=True, default='Email')
    slack_webhook_url = models.CharField(max_length=140, blank=True, null=True, default='')
    filters = models.TextField(blank=True, null=True, default='')
    document_type = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.SmallIntegerField(default=0)
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    event = models.CharField(max_length=140, blank=True, null=True, default='')
    method = models.CharField(max_length=140, blank=True, null=True, default='')
    date_changed = models.CharField(max_length=140, blank=True, null=True, default='')
    days_in_advance = models.IntegerField(null=True, blank=True)
    value_changed = models.CharField(max_length=140, blank=True, null=True, default='')
    sender = models.CharField(max_length=140, blank=True, null=True, default='')
    sender_email = models.CharField(max_length=140, blank=True, null=True, default='')
    condition = models.TextField(blank=True, null=True, default='')
    set_property_after_alert = models.CharField(max_length=140, blank=True, null=True, default='')
    property_value = models.CharField(max_length=140, blank=True, null=True, default='')
    email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.CharField(max_length=140, blank=True, null=True, default='')
    message = models.TextField(blank=True, null=True, default='Add your message here')
    attach_print = models.SmallIntegerField(default=0)
    print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    send_system_notification = models.SmallIntegerField(default=0)
    notification_type = models.CharField(max_length=140, blank=True, null=True, default='Alert')
    send_to_all_assignees = models.SmallIntegerField(default=0)
    message_type = models.CharField(max_length=140, blank=True, null=True, default='Markdown')
    datetime_changed = models.CharField(max_length=140, blank=True, null=True, default='')
    minutes_offset = models.IntegerField(null=True, blank=True)
    datetime_last_run = models.DateTimeField(null=True, blank=True)
    condition_type = models.CharField(max_length=140, blank=True, null=True, default='Python')
    attach_files = models.CharField(max_length=140, blank=True, null=True, default='')
    from_attach_field = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
