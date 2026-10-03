# Ported from crm/fcrm/doctype/crm_lead_status/crm_lead_status.json (frappe/crm, AGPL-3.0)
from django.db import models

STATUS_TYPES = [
    ("Open", "Open"),
    ("Ongoing", "Ongoing"),
    ("On Hold", "On Hold"),
    ("Won", "Won"),
    ("Lost", "Lost"),
]

COLORS = [(c, c) for c in (
    "black", "gray", "blue", "green", "red", "pink",
    "orange", "amber", "yellow", "cyan", "teal", "violet", "purple",
)]


class CRMLeadStatus(models.Model):
    doctype_label = "CRM Lead Status"

    name = models.CharField(max_length=140, primary_key=True)  # lead_status (autoname: field:lead_status)
    type = models.CharField(max_length=20, choices=STATUS_TYPES, default="Open")
    color = models.CharField(max_length=20, choices=COLORS, default="gray")
    position = models.IntegerField(default=1)

    class Meta:
        app_label = "crm"
        db_table = "crm_lead_status"
        verbose_name = "CRM Lead Status"
        verbose_name_plural = "CRM Lead Statuses"
        ordering = ["position"]

    def __str__(self):
        return self.name
