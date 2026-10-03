# Ported from crm/domain_enrichment/doctype/crm_enrichment_field_mapping (frappe/crm, AGPL-3.0)
from django.db import models

SOURCE_KEY_CHOICES = [(k, k) for k in (
    "company_name", "description", "logo", "industry", "primary_email", "primary_phone",
    "secondary_phone", "linkedin", "twitter", "github", "facebook", "instagram", "youtube",
)]
WRITE_POLICY_CHOICES = [(p, p) for p in ("Fill if empty", "Always refresh", "Override defaults")]


class CRMEnrichmentFieldMapping(models.Model):
    enabled = models.BooleanField(default=True)
    source_key = models.CharField(max_length=20, choices=SOURCE_KEY_CHOICES)
    target_doctype = models.CharField(max_length=140)  # Link -> DocType, kept as a plain label
    target_fieldname = models.CharField(max_length=140)
    write_policy = models.CharField(max_length=20, choices=WRITE_POLICY_CHOICES, default="Fill if empty")
    create_missing_link = models.BooleanField(default=False)
    default_values = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_field_mapping"
        verbose_name = "CRM Enrichment Field Mapping"

    def __str__(self):
        return f"{self.source_key} -> {self.target_doctype}.{self.target_fieldname}"
