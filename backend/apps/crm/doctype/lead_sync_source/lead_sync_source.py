# Port of frappe/crm's lead syncing doctypes (AGPL-3.0): Lead Sync Source and its Facebook
# page / lead form / form question records, plus the Failed Lead Sync Log.
import secrets

from django.db import models

SOURCE_TYPES = [("Facebook", "Facebook")]
FREQUENCIES = [("Hourly", "Hourly"), ("Daily", "Daily"), ("Weekly", "Weekly")]
FAILURE_TYPES = [("Mapping Failed", "Mapping Failed"), ("Sync Failed", "Sync Failed"), ("Synced", "Synced")]


class FacebookPage(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    page_name = models.CharField(max_length=255, blank=True)
    access_token = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_facebook_page"
        verbose_name = "Facebook Page"

    def __str__(self):
        return self.page_name or self.name


class FacebookLeadForm(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    lead_form_name = models.CharField(max_length=255, blank=True)
    page = models.ForeignKey(FacebookPage, on_delete=models.CASCADE, related_name="lead_forms")

    class Meta:
        app_label = "crm"
        db_table = "crm_facebook_lead_form"
        verbose_name = "Facebook Lead Form"

    def __str__(self):
        return self.lead_form_name or self.name


class FacebookLeadFormQuestion(models.Model):
    parent = models.ForeignKey(FacebookLeadForm, on_delete=models.CASCADE, related_name="questions")
    idx = models.PositiveIntegerField(default=0)
    key = models.CharField(max_length=140)
    label = models.CharField(max_length=255, blank=True)
    type = models.CharField(max_length=60, blank=True)
    mapped_to_crm_field = models.CharField(max_length=140, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_facebook_lead_form_question"
        verbose_name = "Facebook Lead Form Question"
        ordering = ["idx", "id"]


class LeadSyncSource(models.Model):
    name = models.CharField(max_length=140, primary_key=True)
    type = models.CharField(max_length=20, choices=SOURCE_TYPES, default="Facebook")
    access_token = models.TextField(blank=True)
    enabled = models.BooleanField(default=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    background_sync_frequency = models.CharField(max_length=10, choices=FREQUENCIES, default="Hourly")
    facebook_page = models.ForeignKey(
        FacebookPage, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    facebook_lead_form = models.ForeignKey(
        FacebookLeadForm, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_lead_sync_source"
        verbose_name = "Lead Sync Source"
        ordering = ["-modified"]

    def __str__(self):
        return self.name


class FailedLeadSyncLog(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    source = models.ForeignKey(LeadSyncSource, on_delete=models.CASCADE, related_name="failed_logs")
    type = models.CharField(max_length=20, choices=FAILURE_TYPES, default="Sync Failed")
    lead_data = models.TextField(blank=True)
    traceback = models.TextField(blank=True)
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_failed_lead_sync_log"
        verbose_name = "Failed Lead Sync Log"
        ordering = ["-creation"]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = secrets.token_hex(6)
        super().save(*args, **kwargs)
