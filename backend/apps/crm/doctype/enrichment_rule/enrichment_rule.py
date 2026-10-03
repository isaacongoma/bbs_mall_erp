# Ported from crm/domain_enrichment/doctype/crm_enrichment_rule (frappe/crm, AGPL-3.0)
from django.db import models

from apps.core.naming import make_autoname

RULE_TYPE_CHOICES = [("Industry", "Industry"), ("Social", "Social")]
MATCH_SCOPE_CHOICES = [(s, s) for s in ("Headline", "Full Text", "HTML", "Headers", "URL")]


class CRMEnrichmentRule(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    rule_name = models.CharField(max_length=140, unique=True)
    rule_type = models.CharField(max_length=10, choices=RULE_TYPE_CHOICES)
    enabled = models.BooleanField(default=True)
    target_value = models.CharField(max_length=140, blank=True)
    industry = models.ForeignKey(
        "crm.CRMIndustry", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    weight = models.FloatField(default=1)
    match_scope = models.CharField(max_length=10, choices=MATCH_SCOPE_CHOICES, default="Full Text")

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_rule"
        verbose_name = "CRM Enrichment Rule"

    def __str__(self):
        return self.rule_name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = make_autoname(type(self), f"{self.rule_type}-")
        super().save(*args, **kwargs)
