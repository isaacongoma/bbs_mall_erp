# Ported from crm/fcrm/doctype/crm_industry/crm_industry.json (frappe/crm, AGPL-3.0)
from django.db import models


class CRMIndustry(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # industry (autoname: field:industry)

    class Meta:
        app_label = "crm"
        db_table = "crm_industry"
        verbose_name = "CRM Industry"
        verbose_name_plural = "CRM Industries"

    def __str__(self):
        return self.name
