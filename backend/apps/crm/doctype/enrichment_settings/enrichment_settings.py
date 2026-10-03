# Ported from crm/domain_enrichment/doctype/crm_enrichment_settings (frappe/crm, AGPL-3.0)
# Single doctype (issingle: 1) -- one row, modeled as a singleton.
from django.db import models

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


class CRMEnrichmentSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    enabled = models.BooleanField(default=True)
    auto_enrich = models.BooleanField(default=False)
    max_pages = models.IntegerField(default=10)
    max_depth = models.IntegerField(default=2)
    use_sitemap = models.BooleanField(default=True)
    request_timeout = models.IntegerField(default=10)
    max_download_bytes = models.IntegerField(default=3_000_000)
    retry_count = models.IntegerField(default=2)
    user_agent = models.CharField(max_length=255, default=DEFAULT_USER_AGENT)

    class Meta:
        app_label = "crm"
        db_table = "crm_enrichment_settings"
        verbose_name = "CRM Enrichment Settings"

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "CRMEnrichmentSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj

    @property
    def allowed_domains_list(self):
        return self.domains.filter(kind="allowed")

    @property
    def blocked_domains_list(self):
        return self.domains.filter(kind="blocked")
