# Ported from crm/fcrm/doctype/crm_exotel_settings/crm_exotel_settings.json (frappe/crm, AGPL-3.0)
# Single doctype (issingle: 1) -- one row, modeled as a singleton.
from django.db import models


class CRMExotelSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    enabled = models.BooleanField(default=False)
    record_call = models.BooleanField(default=False)
    account_sid = models.CharField(max_length=140, blank=True)
    subdomain = models.CharField(max_length=140, blank=True)
    api_key = models.CharField(max_length=140, blank=True)
    api_token = models.CharField(max_length=140, blank=True)
    webhook_verify_token = models.CharField(max_length=140, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_exotel_settings"
        verbose_name = "CRM Exotel Settings"

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "CRMExotelSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
