from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class EmailDomainGenerated(FrappeModel):
    doctype = 'Email Domain'
    domain_name = models.CharField(max_length=140, blank=True, null=True, default='')
    email_server = models.CharField(max_length=140, blank=True, null=True, default='')
    use_imap = models.SmallIntegerField(default=0)
    use_ssl = models.SmallIntegerField(default=0)
    use_starttls = models.SmallIntegerField(default=0)
    attachment_limit = models.IntegerField(null=True, blank=True)
    smtp_server = models.CharField(max_length=140, blank=True, null=True, default='')
    use_tls = models.SmallIntegerField(default=0)
    smtp_port = models.CharField(max_length=140, blank=True, null=True, default='')
    incoming_port = models.CharField(max_length=140, blank=True, null=True, default='')
    append_emails_to_sent_folder = models.SmallIntegerField(default=0)
    use_ssl_for_outgoing = models.SmallIntegerField(default=0)
    validate_ssl_certificate = models.SmallIntegerField(default=1)
    validate_ssl_certificate_for_outgoing = models.SmallIntegerField(default=1)
    sent_folder_name = models.CharField(max_length=140, blank=True, null=True, default='Sent')

    class Meta:
        abstract = True
