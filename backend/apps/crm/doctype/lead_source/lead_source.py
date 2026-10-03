# Ported from crm/fcrm/doctype/crm_lead_source/crm_lead_source.json (frappe/crm, AGPL-3.0)
from django.db import models


class CRMLeadSource(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # source_name (autoname: field:source_name)
    details = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_lead_source"
        verbose_name = "CRM Lead Source"

    def __str__(self):
        return self.name
