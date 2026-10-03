# Ported from crm/fcrm/doctype/crm_service_level_priority/crm_service_level_priority.json (frappe/crm, AGPL-3.0)
# Child table -- maps a Communication Status ("priority") to a first-response
# time target on an SLA.
from django.db import models


class CRMServiceLevelPriority(models.Model):
    parent = models.ForeignKey(
        "crm.CRMServiceLevelAgreement", on_delete=models.CASCADE, related_name="priorities"
    )
    idx = models.PositiveIntegerField(default=0)

    default_priority = models.BooleanField(default=False)
    priority = models.ForeignKey("crm.CRMCommunicationStatus", on_delete=models.CASCADE, related_name="+")
    first_response_time = models.DurationField()  # seconds, as a Duration

    class Meta:
        app_label = "crm"
        db_table = "crm_service_level_priority"
        verbose_name = "CRM Service Level Priority"
        ordering = ["idx"]
