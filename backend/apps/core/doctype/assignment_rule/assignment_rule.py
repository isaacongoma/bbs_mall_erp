# Ported from frappe/automation/doctype/assignment_rule/{assignment_rule.json,
# assignment_rule.py} (frappe/frappe, MIT), plus the CRM-added
# assign_condition_json/unassign_condition_json fields (crm/install.py's
# create_assignment_rule_custom_fields, frappe/crm, AGPL-3.0) that back the
# visual condition builder AssignmentRuleView.vue uses instead of raw Python.
from django.conf import settings
from django.db import models

RULE_CHOICES = [
    ("Round Robin", "Round Robin"),
    ("Load Balancing", "Load Balancing"),
    ("Based on Field", "Based on Field"),
    ("Weighted Distribution", "Weighted Distribution"),
]

DAY_CHOICES = [(d, d) for d in (
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
)]


class AssignmentRule(models.Model):
    doctype_label = "Assignment Rule"

    name = models.CharField(max_length=140, primary_key=True)  # autoname: Prompt (user-supplied)
    document_type = models.CharField(max_length=140)  # e.g. "CRM Lead" / "CRM Deal"
    due_date_based_on = models.CharField(max_length=140, blank=True)
    priority = models.IntegerField(default=0)
    disabled = models.BooleanField(default=False)
    description = models.TextField(default="Automatic Assignment")

    rule = models.CharField(max_length=25, choices=RULE_CHOICES)
    assign_condition = models.TextField(blank=True)  # a Python boolean expression
    unassign_condition = models.TextField(blank=True)
    close_condition = models.TextField(blank=True)
    # CRM's own additions -- the visual ConditionBuilder's JSON tree, compiled
    # into assign_condition/unassign_condition on save (see assignment_rule_api.py).
    assign_condition_json = models.TextField(blank=True)
    unassign_condition_json = models.TextField(blank=True)

    field = models.CharField(max_length=140, blank=True)  # used by "Based on Field"
    last_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    current_index = models.IntegerField(default=0)  # used by "Weighted Distribution"

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "assignment_rule"
        verbose_name = "Assignment Rule"
        ordering = ["-priority", "-creation"]

    def __str__(self):
        return self.name


class AssignmentRuleUser(models.Model):
    """Backs both the `users` (Round Robin/Load Balancing) and
    `weighted_users` (Weighted Distribution) tables -- real Frappe uses the
    same "Assignment Rule User" child doctype for both, just two separate
    table fields on the parent; `table_field` here plays that role."""

    TABLE_CHOICES = [("users", "users"), ("weighted_users", "weighted_users")]

    parent_rule = models.ForeignKey(AssignmentRule, on_delete=models.CASCADE, related_name="user_rows")
    table_field = models.CharField(max_length=20, choices=TABLE_CHOICES, default="users")
    idx = models.PositiveIntegerField(default=0)

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    weight = models.IntegerField(default=1)

    class Meta:
        app_label = "core"
        db_table = "assignment_rule_user"
        verbose_name = "Assignment Rule User"
        ordering = ["idx"]


class AssignmentRuleDay(models.Model):
    parent_rule = models.ForeignKey(AssignmentRule, on_delete=models.CASCADE, related_name="day_rows")
    idx = models.PositiveIntegerField(default=0)
    day = models.CharField(max_length=10, choices=DAY_CHOICES)

    class Meta:
        app_label = "core"
        db_table = "assignment_rule_day"
        verbose_name = "Assignment Rule Day"
        ordering = ["idx"]
