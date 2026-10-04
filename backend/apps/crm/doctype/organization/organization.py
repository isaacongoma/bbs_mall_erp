# Ported from crm/fcrm/doctype/crm_organization/{crm_organization.json,crm_organization.py}
# (frappe/crm, AGPL-3.0)
from django.db import models

NO_OF_EMPLOYEES_CHOICES = [(c, c) for c in ("1-10", "11-50", "51-200", "201-500", "501-1000", "1000+")]


class CRMOrganization(models.Model):
    doctype_label = "CRM Organization"

    name = models.CharField(max_length=140, primary_key=True, editable=False)  # organization_name
    organization_name = models.CharField(max_length=140, unique=True)
    website = models.CharField(max_length=255, blank=True)
    organization_logo = models.CharField(max_length=255, blank=True)
    no_of_employees = models.CharField(max_length=10, choices=NO_OF_EMPLOYEES_CHOICES, blank=True)
    annual_revenue = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    industry = models.ForeignKey(
        "crm.CRMIndustry", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    territory = models.ForeignKey(
        "crm.CRMTerritory", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    currency = models.ForeignKey("erpnext.Currency", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    exchange_rate = models.FloatField(default=1)
    address = models.ForeignKey(
        "erpnext.Address", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    company_description = models.TextField(blank=True)
    linkedin = models.CharField(max_length=255, blank=True)
    twitter = models.CharField(max_length=255, blank=True)
    facebook = models.CharField(max_length=255, blank=True)

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_organization"
        verbose_name = "CRM Organization"

    def __str__(self):
        return self.organization_name

    def update_exchange_rate(self, currency_changed: bool):
        if not (currency_changed or not self.exchange_rate):
            return
        from apps.crm.doctype.settings.settings import FCRMSettings
        from apps.crm.exchange_rate import get_exchange_rate

        system_currency = FCRMSettings.get_solo().currency or "USD"
        rate = 1
        if self.currency_id and self.currency_id != system_currency:
            try:
                rate = get_exchange_rate(self.currency_id, system_currency)
            except Exception:
                rate = self.exchange_rate or 1
        self.exchange_rate = rate

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        if not self.name:
            self.name = self.organization_name
        currency_changed = True
        if not is_new:
            previous_currency = type(self).objects.filter(pk=self.pk).values_list("currency_id", flat=True).first()
            currency_changed = previous_currency != self.currency_id
        self.update_exchange_rate(currency_changed)
        super().save(*args, **kwargs)

        if is_new:
            from apps.crm.domain_enrichment.tasks import auto_enrich_on_create

            auto_enrich_on_create(self)
