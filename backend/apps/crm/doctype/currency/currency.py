# Minimal lookup for the Currency Link fields on CRM Organization/Deal.
# ERPNext's own Currency doctype carries far more (number formats, symbols per
# locale); this is scoped to what CRM's exchange-rate lookups need.
from django.db import models


class Currency(models.Model):
    name = models.CharField(max_length=3, primary_key=True)  # ISO code, e.g. "USD"
    symbol = models.CharField(max_length=10, blank=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        app_label = "crm"
        db_table = "currency"
        verbose_name = "Currency"
        verbose_name_plural = "Currencies"

    def __str__(self):
        return self.name
