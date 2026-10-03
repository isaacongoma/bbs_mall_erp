# Ported from crm/domain_enrichment/doctype/crm_enrichment_link_priority (frappe/crm, AGPL-3.0)
from django.db import models


class CRMEnrichmentLinkPriority(models.Model):
    parent = models.ForeignKey(
        "crm.CRMEnrichmentSettings", on_delete=models.CASCADE, related_name="link_priority_order"
    )
    idx = models.PositiveIntegerField(default=0)
    keyword = models.CharField(max_length=140)
    weight = models.FloatField(default=1)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_link_priority"
        verbose_name = "CRM Enrichment Link Priority"
        ordering = ["idx"]
