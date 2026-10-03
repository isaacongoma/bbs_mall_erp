# Ported from crm/domain_enrichment/doctype/crm_enrichment_domain (frappe/crm, AGPL-3.0)
# Child table, reused for both Settings.allowed_domains and Settings.blocked_domains
# (same shape in the original -- one child doctype, two parent tables). `kind`
# distinguishes which list a row belongs to since Django needs one FK, not two tables.
from django.db import models

KIND_CHOICES = [("allowed", "allowed"), ("blocked", "blocked")]


class CRMEnrichmentDomain(models.Model):
    parent = models.ForeignKey(
        "crm.CRMEnrichmentSettings", on_delete=models.CASCADE, related_name="domains"
    )
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    idx = models.PositiveIntegerField(default=0)
    domain = models.CharField(max_length=255)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_domain"
        verbose_name = "CRM Enrichment Domain"
        ordering = ["idx"]
