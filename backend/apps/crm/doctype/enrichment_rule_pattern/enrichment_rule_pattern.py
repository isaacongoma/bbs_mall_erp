# Ported from crm/domain_enrichment/doctype/crm_enrichment_rule_pattern (frappe/crm, AGPL-3.0)
from django.db import models


class CRMEnrichmentRulePattern(models.Model):
    parent = models.ForeignKey("crm.CRMEnrichmentRule", on_delete=models.CASCADE, related_name="patterns")
    idx = models.PositiveIntegerField(default=0)
    pattern = models.CharField(max_length=255)
    is_regex = models.BooleanField(default=False)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_rule_pattern"
        verbose_name = "CRM Enrichment Rule Pattern"
        ordering = ["idx"]
