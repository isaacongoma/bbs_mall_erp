# Ported from frappe/automation/doctype/automation_flow/automation_flow.py and
# frappe/automation/doctype/automation_action/automation_action.json (frappe/frappe, MIT).
# A trigger, its filters, and the ordered steps ("actions") that run when it matches.
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

TRIGGER_TYPE_CHOICES = [(t, t) for t in (
    "Doc Created", "Doc Updated", "Field Value Changed", "Doc Deleted",
    "Doc Submitted", "Doc Cancelled", "Date Based", "Scheduled", "Custom Event", "Manual",
)]
DOC_TRIGGER_TYPES = (
    "Doc Created", "Doc Updated", "Field Value Changed", "Doc Deleted", "Doc Submitted", "Doc Cancelled",
)
# Trigger types this port's dispatch can actually fire. BBS-ERP has no submittable-document
# workflow anywhere in the whole clone, so Doc Submitted/Doc Cancelled are kept as real choices
# (matching the upstream doctype exactly) but can never match -- same as picking a trigger that
# needs a feature this system doesn't implement.
SUPPORTED_DOC_TRIGGER_TYPES = ("Doc Created", "Doc Updated", "Field Value Changed", "Doc Deleted")

DATE_DIRECTION_CHOICES = [("Before", "Before"), ("After", "After")]
RUN_AS_CHOICES = [
    ("Triggering User", "Triggering User"),
    ("Document Owner", "Document Owner"),
    ("Automation User", "Automation User"),
]

STEP_TYPE_CHOICES = [(t, t) for t in ("Action", "Wait", "WaitForEvent", "If")]
STEP_TYPES = ("Action", "Wait", "WaitForEvent", "If")
WAIT_STEP_TYPES = ("Wait", "WaitForEvent")
BRANCH_CHOICES = [("", ""), ("If", "If"), ("Else", "Else")]


class AutomationFlow(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=140, blank=True)

    enabled = models.BooleanField(default=False)
    disabled_reason = models.TextField(blank=True)

    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPE_CHOICES)
    trigger_field = models.CharField(max_length=140, blank=True)
    from_value = models.CharField(max_length=255, blank=True)
    to_value = models.CharField(max_length=255, blank=True)
    custom_event = models.CharField(max_length=140, blank=True)
    date_field = models.CharField(max_length=140, blank=True)
    date_offset = models.IntegerField(default=0)
    date_direction = models.CharField(max_length=10, choices=DATE_DIRECTION_CHOICES, default="Before")
    cron_expression = models.CharField(max_length=140, blank=True)
    next_run = models.DateTimeField(null=True, blank=True)

    filters = models.TextField(blank=True)
    condition = models.TextField(blank=True)
    relationships = models.TextField(blank=True)
    revalidate_on_run = models.BooleanField(default=False)

    run_as = models.CharField(max_length=20, choices=RUN_AS_CHOICES, default="Automation User")
    automation_user = models.ForeignKey(
        "core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    stop_on_error = models.BooleanField(default=True)
    # Referenced by the Vue builder's default document but not wired to any control there yet
    # (upstream has no throttle UI either at this doctype revision) -- stored for payload
    # round-trip parity, not enforced by the drainer.
    throttle_per_minute = models.IntegerField(default=0)

    owner = models.ForeignKey(
        "core.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+", editable=False
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "automation_flow"
        verbose_name = "Automation Flow"
        ordering = ["-modified"]

    def __str__(self):
        return self.title or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            from apps.core.naming import make_autoname

            self.name = make_autoname(type(self), "AUTO-")
        self.full_clean_flow()
        super().save(*args, **kwargs)

    # -- validation (ported from AutomationFlow.validate()) --------------------

    def full_clean_flow(self):
        self.validate_document_type()
        self.validate_trigger_config()
        self.validate_execution_identity()
        if self.enabled and not self.action_rows.exists() and self.pk is None:
            # A brand-new flow has no rows yet at this point in save() -- the real check
            # (actions must exist) happens in the view after child rows are attached, mirroring
            # how AssignmentRuleViewSet/CRMServiceLevelAgreementViewSet split parent save from
            # child-row replacement.
            pass

    def validate_document_type(self):
        if not self.document_type:
            return
        from apps.crm.doctype_registry import get_doctype_model

        if get_doctype_model(self.document_type) is None:
            raise ValidationError(f"Unknown Document Type: {self.document_type}")

    def validate_trigger_config(self):
        needs_doctype = self.trigger_type in DOC_TRIGGER_TYPES or self.trigger_type == "Date Based"
        if needs_doctype and not self.document_type:
            raise ValidationError(f"{self.trigger_type} trigger requires a Document Type")
        if self.trigger_type == "Field Value Changed" and not self.trigger_field:
            raise ValidationError("Field Value Changed trigger requires a Trigger Field")
        if self.trigger_type == "Date Based" and not (self.date_field and self.date_direction):
            raise ValidationError("Date Based trigger requires a Date Field and a Date Direction")
        if self.trigger_type == "Custom Event" and not self.custom_event:
            raise ValidationError("Custom Event trigger requires an event name")
        if self.trigger_type == "Scheduled":
            self.validate_cron()
        self.set_next_run()

    def validate_cron(self):
        from croniter import croniter

        if not self.cron_expression:
            raise ValidationError("Scheduled trigger requires a Cron Expression")
        if not croniter.is_valid(self.cron_expression):
            raise ValidationError(f"Invalid cron expression: {self.cron_expression}")

    def set_next_run(self):
        from apps.core.automation_engine.scheduler import next_fire
        from django.utils import timezone

        if self.trigger_type != "Scheduled":
            self.next_run = None
            return
        previous = type(self).objects.filter(pk=self.pk).values_list("cron_expression", flat=True).first()
        if previous != self.cron_expression or not self.next_run:
            self.next_run = next_fire(self.cron_expression, timezone.now())

    def validate_execution_identity(self):
        self.run_as = self.run_as or "Automation User"
        if self.run_as != "Automation User":
            return
        if not self.automation_user_id:
            from apps.core.models import User

            admin = User.objects.filter(is_superuser=True).order_by("id").first()
            self.automation_user_id = admin.pk if admin else None

    def if_step_at(self, idx):
        return self.action_rows.filter(idx=idx, step_type="If").first()


class AutomationAction(models.Model):
    """Child table backing AutomationFlow.actions -- one row per step."""

    flow = models.ForeignKey(AutomationFlow, on_delete=models.CASCADE, related_name="action_rows")
    idx = models.PositiveIntegerField(default=0)

    step_key = models.CharField(max_length=140, blank=True)
    step_type = models.CharField(max_length=20, choices=STEP_TYPE_CHOICES, default="Action")
    action_type = models.CharField(max_length=140, blank=True)
    target = models.CharField(max_length=140, default="trigger")
    output_alias = models.CharField(max_length=140, blank=True)
    params = models.TextField(blank=True)
    step_condition = models.TextField(blank=True)
    related_condition = models.TextField(blank=True)
    parent_step = models.IntegerField(null=True, blank=True)
    branch = models.CharField(max_length=10, choices=BRANCH_CHOICES, blank=True)

    class Meta:
        app_label = "core"
        db_table = "automation_action"
        verbose_name = "Automation Action"
        ordering = ["idx"]

    def __str__(self):
        return self.step_key or f"step_{self.idx}"
