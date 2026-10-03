# Port of frappe's Email Account doctype (frappe/frappe, MIT) reduced to the fields CRM's Settings
# screens use. Mail transport (sending through SMTP / pulling from IMAP) is not implemented here --
# the record stores the configuration and enforces the "only one default" rules.
from django.db import models

SERVICE_CHOICES = [
    ("GMail", "GMail"),
    ("Outlook", "Outlook"),
    ("Sendgrid", "Sendgrid"),
    ("SparkPost", "SparkPost"),
    ("Yahoo", "Yahoo"),
    ("Yandex", "Yandex"),
    ("Frappe Mail", "Frappe Mail"),
]


class EmailAccount(models.Model):
    email_account_name = models.CharField(max_length=140, unique=True)
    email_id = models.EmailField()
    service = models.CharField(max_length=20, choices=SERVICE_CHOICES, blank=True)
    password = models.CharField(max_length=255, blank=True)
    api_key = models.CharField(max_length=255, blank=True)
    api_secret = models.CharField(max_length=255, blank=True)
    frappe_mail_site = models.CharField(max_length=255, blank=True)
    enable_incoming = models.BooleanField(default=False)
    enable_outgoing = models.BooleanField(default=False)
    default_incoming = models.BooleanField(default=False)
    default_outgoing = models.BooleanField(default=False)
    create_lead_from_incoming_email = models.BooleanField(default=False)
    signature = models.TextField(blank=True)
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "core_email_account"
        verbose_name = "Email Account"
        ordering = ["-modified"]

    def __str__(self):
        return self.email_account_name

    @property
    def name(self) -> str:
        return self.email_account_name

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        others = EmailAccount.objects.exclude(pk=self.pk)
        if self.default_incoming:
            others.filter(default_incoming=True).update(default_incoming=False)
        if self.default_outgoing:
            others.filter(default_outgoing=True).update(default_outgoing=False)
