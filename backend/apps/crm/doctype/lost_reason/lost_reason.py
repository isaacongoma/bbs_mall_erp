# Ported from crm/fcrm/doctype/crm_lost_reason/crm_lost_reason.json (frappe/crm, AGPL-3.0)
from django.db import models


class CRMLostReason(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # lost_reason (autoname: field:lost_reason)
    description = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_lost_reason"
        verbose_name = "CRM Lost Reason"

    def __str__(self):
        return self.name
