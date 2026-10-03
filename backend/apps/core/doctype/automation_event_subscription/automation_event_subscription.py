# Ported from frappe/automation/doctype/automation_event_subscription/automation_event_subscription.json
# (frappe/frappe, MIT). Tracks a parked WaitForEvent step until a matching frappe-style
# emit() claims it or its resume row's run_after (the timeout) arrives first.
import uuid

from django.db import models

STATUS_CHOICES = [(s, s) for s in ("Waiting", "Matched", "Timed Out", "Cancelled")]


class AutomationEventSubscription(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)  # autoname: hash
    event_name = models.CharField(max_length=140)
    correlation_key = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Waiting")
    expires_at = models.DateTimeField()

    run = models.ForeignKey(
        "core.BackgroundTask", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    step_key = models.CharField(max_length=140, blank=True)
    resume_queue = models.ForeignKey(
        "core.AutomationTriggerQueue", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    event_payload = models.TextField(blank=True)

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "automation_event_subscription"
        verbose_name = "Automation Event Subscription"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
