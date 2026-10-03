# Ported from crm/domain_enrichment/doctype/crm_enrichment_skip_pattern (frappe/crm, AGPL-3.0)
from django.db import models


class CRMEnrichmentSkipPattern(models.Model):
    parent = models.ForeignKey(
        "crm.CRMEnrichmentSettings", on_delete=models.CASCADE, related_name="skip_patterns"
    )
    idx = models.PositiveIntegerField(default=0)
    pattern = models.CharField(max_length=255)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_skip_pattern"
        verbose_name = "CRM Enrichment Skip Pattern"
        ordering = ["idx"]
