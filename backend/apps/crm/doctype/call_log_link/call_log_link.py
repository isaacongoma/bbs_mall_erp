# Ported from Frappe core's generic "Dynamic Link" child doctype, as used by
# CRM Call Log's `links` table (frappe/frappe, MIT).
from django.db import models


class CallLogLink(models.Model):
    parent = models.ForeignKey("crm.CRMCallLog", on_delete=models.CASCADE, related_name="links")
    idx = models.PositiveIntegerField(default=0)

    link_doctype = models.CharField(max_length=140)
    link_name = models.CharField(max_length=140)

    class Meta:
        app_label = "crm"
        db_table = "crm_call_log_link"
        verbose_name = "Call Log Link"
        ordering = ["idx"]
