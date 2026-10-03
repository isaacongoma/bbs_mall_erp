# Ported from crm/fcrm/doctype/crm_twilio_settings/crm_twilio_settings.json (frappe/crm, AGPL-3.0)
# Single doctype (issingle: 1) -- one row, modeled as a singleton like FCRMSettings.
#
# auth_token/api_secret are Password fields in the original (encrypted at
# rest by Frappe's own crypto). Plain CharField here -- wire up field-level
# encryption (e.g. django-fernet-fields) before storing real credentials.
from django.db import models


class CRMTwilioSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    enabled = models.BooleanField(default=False)
    record_calls = models.BooleanField(default=False)
    account_sid = models.CharField(max_length=140, blank=True)
    auth_token = models.CharField(max_length=140, blank=True)
    api_key = models.CharField(max_length=140, blank=True)
    api_secret = models.CharField(max_length=140, blank=True)
    twiml_sid = models.CharField(max_length=140, blank=True)
    app_name = models.CharField(max_length=140, blank=True)
    twilio_apps = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_twilio_settings"
        verbose_name = "CRM Twilio Settings"

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "CRMTwilioSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
