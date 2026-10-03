# Ported from crm/fcrm/doctype/crm_service_day/crm_service_day.json (frappe/crm, AGPL-3.0)
# Child table -- one row per working weekday on an SLA.
from django.db import models

WORKDAY_CHOICES = [(d, d) for d in (
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
)]


class CRMServiceDay(models.Model):
    parent = models.ForeignKey(
        "crm.CRMServiceLevelAgreement", on_delete=models.CASCADE, related_name="working_hours"
    )
    idx = models.PositiveIntegerField(default=0)

    workday = models.CharField(max_length=10, choices=WORKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        app_label = "crm"
        db_table = "crm_service_day"
        verbose_name = "CRM Service Day"
        ordering = ["idx"]
