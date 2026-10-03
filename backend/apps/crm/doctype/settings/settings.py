# Ported from crm/fcrm/doctype/fcrm_settings/fcrm_settings.json (frappe/crm, AGPL-3.0)
# Frappe's "Single" doctype (one row, no list view) -- modeled here as a
# singleton via a fixed pk.
from django.db import models

PROVIDER_CHOICES = [(p, p) for p in (
    "frankfurter.app", "fawazahmed-exchange-api", "exchangerate.host", "exchangerate-api",
)]


class FCRMSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    # Blank by default, matching the real doctype (a plain Link with no
    # default) -- DashboardSettings.vue shows a selectable Currency dropdown
    # only while this is unset, then locks to read-only text once chosen
    # ("Once set, cannot be edited"). Defaulting it to "USD" here skipped
    # that whole first-time-setup flow.
    currency = models.CharField(max_length=3, blank=True)
    enable_forecasting = models.BooleanField(default=False)
    auto_update_expected_deal_value = models.BooleanField(default=False)
    enable_sales_hierarchy = models.BooleanField(default=False)
    service_provider = models.CharField(max_length=30, choices=PROVIDER_CHOICES, default="frankfurter.app")
    access_key = models.CharField(max_length=140, blank=True)
    brand_name = models.CharField(max_length=140, blank=True)
    brand_logo = models.CharField(max_length=255, blank=True)
    favicon = models.CharField(max_length=255, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "fcrm_settings"
        verbose_name = "FCRM Settings"

    def save(self, *args, **kwargs):
        self.id = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls) -> "FCRMSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
