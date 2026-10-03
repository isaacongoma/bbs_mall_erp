# Ported from frappe/automation/doctype/automation_settings/automation_settings.json
# (frappe/frappe, MIT). A Single doctype there -- modeled the same way this port already
# models FCRM Settings / System Settings: a singleton row via get_solo().
from django.db import models


class AutomationSettings(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)

    disable_automations = models.BooleanField(default=False)
    max_depth = models.IntegerField(default=3)

    failure_threshold = models.IntegerField(default=10)
    stale_running_minutes = models.IntegerField(default=30)
    max_attempts = models.IntegerField(default=3)
    drain_seconds = models.FloatField(default=0)
    commit_every = models.IntegerField(default=50)

    queue_retention_days = models.IntegerField(default=7)

    step_output_limit = models.IntegerField(default=65536)
    event_payload_limit = models.IntegerField(default=65536)
    allow_unregistered_events = models.BooleanField(default=False)

    class Meta:
        app_label = "core"
        db_table = "automation_settings"
        verbose_name = "Automation Settings"

    def __str__(self):
        return "Automation Settings"

    @classmethod
    def get_solo(cls) -> "AutomationSettings":
        obj, _ = cls.objects.get_or_create(id=1)
        return obj
