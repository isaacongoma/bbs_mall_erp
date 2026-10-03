# Ported from crm/fcrm/doctype/crm_telephony_agent/crm_telephony_agent.json (frappe/crm, AGPL-3.0)
from django.conf import settings
from django.db import models

MEDIUM_CHOICES = [("", ""), ("Twilio", "Twilio"), ("Exotel", "Exotel")]
DEVICE_CHOICES = [("Computer", "Computer"), ("Phone", "Phone")]


class CRMTelephonyAgent(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True, related_name="telephony_agent"
    )
    mobile_no = models.CharField(max_length=30, blank=True)
    twilio_number = models.CharField(max_length=30, blank=True)
    exotel_number = models.CharField(max_length=30, blank=True)
    default_medium = models.CharField(max_length=10, choices=MEDIUM_CHOICES, blank=True)
    call_receiving_device = models.CharField(max_length=10, choices=DEVICE_CHOICES, default="Computer")

    class Meta:
        app_label = "crm"
        db_table = "crm_telephony_agent"
        verbose_name = "CRM Telephony Agent"

    def __str__(self):
        return self.user.get_full_name() or self.user.username
