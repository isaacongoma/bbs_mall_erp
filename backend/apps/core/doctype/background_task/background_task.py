# Ported from frappe/core/doctype/background_task/background_task.json (frappe/frappe, MIT)
# Real Frappe's queued-job history record. Every Automation Flow run writes one of these
# (see apps/core/automation_engine/runner.py), keyed by task_id (autoname: field:task_id).
from django.db import models

STATUS_CHOICES = [
    ("Queued", "Queued"),
    ("Running", "Running"),
    ("Completed", "Completed"),
    ("Failed", "Failed"),
    ("Cancelled", "Cancelled"),
]


class BackgroundTask(models.Model):
    task_id = models.CharField(max_length=140, primary_key=True)
    job_id = models.CharField(max_length=140, blank=True)
    task_name = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Queued")
    user = models.ForeignKey("core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    method = models.CharField(max_length=255, blank=True)
    arguments = models.TextField(blank=True)
    result = models.TextField(blank=True)
    exception = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    ref_doctype = models.CharField(max_length=140, blank=True)
    ref_docname = models.CharField(max_length=140, blank=True)
    queue = models.CharField(max_length=140, blank=True)
    progress = models.IntegerField(default=0)
    stage = models.CharField(max_length=140, blank=True)
    show_progress_bar = models.BooleanField(default=True)
    allow_user_cancellation = models.BooleanField(default=True)
    allow_user_retry = models.BooleanField(default=True)
    is_mapreduce = models.BooleanField(default=False)
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "background_task"
        verbose_name = "Background Task"
        ordering = ["-creation"]
        indexes = [models.Index(fields=["task_name", "method", "creation"], name="bg_task_run_lookup_idx")]

    def __str__(self):
        return self.task_id
