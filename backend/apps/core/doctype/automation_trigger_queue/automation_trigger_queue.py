# Ported from frappe/automation/doctype/automation_trigger_queue/automation_trigger_queue.json
# (frappe/frappe, MIT). See apps/core/automation_engine/queue.py for the status-transition logic.
import uuid

from django.db import models

STATUS_CHOICES = [(s, s) for s in ("Pending", "Scheduled", "Running", "Done", "Failed", "Skipped")]
WAITING_STATES = ("Pending", "Scheduled")


class AutomationTriggerQueue(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)  # autoname: hash
    automation = models.ForeignKey(
        "core.AutomationFlow", on_delete=models.CASCADE, related_name="queue_rows"
    )
    ref_doctype = models.CharField(max_length=140, blank=True)
    ref_name = models.CharField(max_length=140, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")

    triggered_at = models.DateTimeField()
    run_after = models.DateTimeField(null=True, blank=True)
    attempt = models.IntegerField(default=0)
    depth = models.IntegerField(default=0)
    triggered_by = models.ForeignKey(
        "core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    event_payload = models.TextField(blank=True)

    # Set only on a resume row -- the Background Task (by task_id) this row continues.
    resume_run = models.CharField(max_length=140, blank=True)
    resume_from_idx = models.IntegerField(null=True, blank=True)

    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "automation_trigger_queue"
        verbose_name = "Automation Trigger Queue"
        constraints = [
            # The real dedup guard: a fresh trigger for the same (automation, document) folds
            # into whatever waiting row already exists rather than double-queuing. A resume row
            # is exempt (resume_run set) since it is never a duplicate of anything.
            models.UniqueConstraint(
                fields=["automation", "ref_doctype", "ref_name"],
                condition=models.Q(status__in=WAITING_STATES, resume_run=""),
                name="automation_queue_dedup",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
