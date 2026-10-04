from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class CommunicationGenerated(FrappeModel):
    doctype = 'Communication'
    subject = models.TextField(blank=True, null=True, default='')
    communication_medium = models.CharField(max_length=140, blank=True, null=True, default='')
    sender = models.CharField(max_length=255, blank=True, null=True, default='')
    recipients = models.TextField(blank=True, null=True, default='')
    cc = models.TextField(blank=True, null=True, default='')
    bcc = models.TextField(blank=True, null=True, default='')
    phone_no = models.CharField(max_length=140, blank=True, null=True, default='')
    delivery_status = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    text_content = models.TextField(blank=True, null=True, default='')
    communication_type = models.CharField(max_length=140, blank=True, null=True, default='Communication')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    sent_or_received = models.CharField(max_length=140, blank=True, null=True, default='')
    communication_date = models.DateTimeField(null=True, blank=True)
    read_receipt = models.SmallIntegerField(default=0)
    sender_full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    read_by_recipient = models.SmallIntegerField(default=0)
    read_by_recipient_on = models.DateTimeField(null=True, blank=True)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_owner = models.CharField(max_length=140, blank=True, null=True, default='')
    email_account = models.CharField(max_length=140, blank=True, null=True, default='')
    in_reply_to = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    unread_notification_sent = models.SmallIntegerField(default=0)
    seen = models.SmallIntegerField(default=0)
    _user_tags = models.CharField(max_length=140, blank=True, null=True, default='')
    message_id = models.TextField(blank=True, null=True, default='')
    uid = models.IntegerField(null=True, blank=True)
    email_status = models.CharField(max_length=140, blank=True, null=True, default='')
    has_attachment = models.SmallIntegerField(default=0)
    email_template = models.CharField(max_length=140, blank=True, null=True, default='')
    imap_folder = models.CharField(max_length=140, blank=True, null=True, default='')
    send_after = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True
