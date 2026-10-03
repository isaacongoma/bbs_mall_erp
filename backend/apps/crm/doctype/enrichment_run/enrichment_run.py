# Ported from crm/domain_enrichment/doctype/crm_enrichment_run (frappe/crm, AGPL-3.0)
import uuid

from django.db import models

STATUS_CHOICES = [(s, s) for s in ("Queued", "Running", "Completed", "Failed")]


class CRMEnrichmentRun(models.Model):
    name = models.CharField(max_length=32, primary_key=True, editable=False)  # autoname: hash
    reference_doctype = models.CharField(max_length=140, blank=True)
    reference_name = models.CharField(max_length=140, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Queued")
    source_website = models.CharField(max_length=255, blank=True)
    started_on = models.DateTimeField(null=True, blank=True)
    finished_on = models.DateTimeField(null=True, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    industry = models.CharField(max_length=140, blank=True)
    industry_confidence = models.FloatField(default=0)
    emails_found = models.IntegerField(default=0)
    phones_found = models.IntegerField(default=0)
    social_profiles = models.TextField(blank=True)
    raw_json = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_run"
        verbose_name = "CRM Enrichment Run"
        ordering = ["-modified"]

    def __str__(self):
        return self.source_website or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
