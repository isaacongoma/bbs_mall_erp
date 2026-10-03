# Ported from crm/fcrm/doctype/crm_communication_status/crm_communication_status.json (frappe/crm, AGPL-3.0)
from django.db import models


class CRMCommunicationStatus(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # status (autoname: field:status)

    class Meta:
        app_label = "crm"
        db_table = "crm_communication_status"
        verbose_name = "CRM Communication Status"
        verbose_name_plural = "CRM Communication Statuses"

    def __str__(self):
        return self.name
