# Ported from crm/fcrm/doctype/crm_deal_status/crm_deal_status.json (frappe/crm, AGPL-3.0)
from django.db import models

from apps.crm.doctype.lead_status.lead_status import COLORS, STATUS_TYPES


class CRMDealStatus(models.Model):
    doctype_label = "CRM Deal Status"

    name = models.CharField(max_length=140, primary_key=True)  # deal_status (autoname: field:deal_status)
    type = models.CharField(max_length=20, choices=STATUS_TYPES, default="Open")
    position = models.IntegerField(default=1)
    probability = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    color = models.CharField(max_length=20, choices=COLORS, default="gray")

    class Meta:
        app_label = "crm"
        db_table = "crm_deal_status"
        verbose_name = "CRM Deal Status"
        verbose_name_plural = "CRM Deal Statuses"
        ordering = ["position"]

    def __str__(self):
        return self.name
