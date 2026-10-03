# Ported from crm/fcrm/doctype/crm_task/{crm_task.json,crm_task.py} (frappe/crm, AGPL-3.0)
from django.conf import settings
from django.db import models

from apps.core.assignable import AssignableMixin
from apps.core.middleware import get_current_user

PRIORITY_CHOICES = [("Low", "Low"), ("Medium", "Medium"), ("High", "High")]
STATUS_CHOICES = [
    ("Backlog", "Backlog"), ("Todo", "Todo"), ("In Progress", "In Progress"),
    ("Done", "Done"), ("Canceled", "Canceled"),
]


class CRMTask(AssignableMixin, models.Model):
    doctype_label = "CRM Task"

    title = models.CharField(max_length=140)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True)
    start_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    description = models.TextField(blank=True)
    reference_doctype = models.CharField(max_length=140, blank=True)
    reference_docname = models.CharField(max_length=140, blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_task"
        verbose_name = "CRM Task"
        ordering = ["-modified"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        previous_assigned_to_id = None
        if not is_new:
            previous_assigned_to_id = (
                type(self).objects.filter(pk=self.pk).values_list("assigned_to_id", flat=True).first()
            )

        user = get_current_user()
        if user and getattr(user, "is_authenticated", False) and is_new:
            self.owner = user

        super().save(*args, **kwargs)

        if is_new:
            self.assign_to()
        elif self.assigned_to_id and previous_assigned_to_id != self.assigned_to_id:
            if previous_assigned_to_id:
                self.unassign_agent(previous_assigned_to_id)
            self.assign_to()

    def assign_to(self):
        if self.assigned_to_id:
            self.assign_agent(self.assigned_to)
