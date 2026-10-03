# Ported from crm/fcrm/doctype/crm_rolling_response_time/crm_rolling_response_time.json (frappe/crm, AGPL-3.0)
# Child table -- appended to a Lead/Deal each time a rolling SLA response is logged.
from django.db import models

STATUS_CHOICES = [("Fulfilled", "Fulfilled"), ("Failed", "Failed")]


class CRMRollingResponseTime(models.Model):
    parent_lead = models.ForeignKey(
        "crm.CRMLead", on_delete=models.CASCADE, related_name="rolling_responses", null=True, blank=True
    )
    parent_deal = models.ForeignKey(
        "crm.CRMDeal", on_delete=models.CASCADE, related_name="rolling_responses", null=True, blank=True
    )
    idx = models.PositiveIntegerField(default=0)

    response_time = models.DurationField(null=True, blank=True)
    responded_on = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_rolling_response_time"
        verbose_name = "CRM Rolling Response Time"
        ordering = ["idx"]
