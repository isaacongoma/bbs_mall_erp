# Ported from crm/fcrm/doctype/crm_call_log/{crm_call_log.json,crm_call_log.py} (frappe/crm, AGPL-3.0)
import secrets

from django.conf import settings
from django.db import models

STATUS_CHOICES = [(s, s) for s in (
    "Initiated", "Ringing", "In Progress", "Completed", "Failed", "Busy", "No Answer", "Queued", "Canceled",
)]
TYPE_CHOICES = [("Incoming", "Incoming"), ("Outgoing", "Outgoing")]
TELEPHONY_MEDIUM_CHOICES = [("", ""), ("Manual", "Manual"), ("Twilio", "Twilio"), ("Exotel", "Exotel")]


class CRMCallLog(models.Model):
    id = models.CharField(max_length=32, primary_key=True, editable=False)  # autoname: field:id
    telephony_medium = models.CharField(max_length=10, choices=TELEPHONY_MEDIUM_CHOICES, blank=True)
    from_number = models.CharField(max_length=30, db_column="from_number")
    to_number = models.CharField(max_length=30, db_column="to_number")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    duration = models.DurationField(null=True, blank=True)
    medium = models.CharField(max_length=140, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    recording_url = models.TextField(blank=True)
    note = models.ForeignKey("crm.FCRMNote", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    caller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reference_doctype = models.CharField(max_length=140, default="CRM Lead", blank=True)
    reference_docname = models.CharField(max_length=140, blank=True)

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_call_log"
        verbose_name = "CRM Call Log"
        ordering = ["-modified"]

    def __str__(self):
        return self.id

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = secrets.token_hex(6)  # generate_hash(length=12)
        if not self.telephony_medium:
            self.telephony_medium = "Manual"
        super().save(*args, **kwargs)

    def has_link(self, doctype, name):
        return self.links.filter(link_doctype=doctype, link_name=name).exists()

    def link_with_reference_doc(self, reference_doctype, reference_name):
        if self.has_link(reference_doctype, reference_name):
            return
        self.links.create(link_doctype=reference_doctype, link_name=reference_name)
