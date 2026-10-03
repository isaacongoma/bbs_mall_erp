# Ported from frappe/desk/doctype/todo/todo.json (frappe/frappe, MIT)
from django.conf import settings
from django.db import models

STATUS_CHOICES = [("Open", "Open"), ("Closed", "Closed"), ("Cancelled", "Cancelled")]
PRIORITY_CHOICES = [("High", "High"), ("Medium", "Medium"), ("Low", "Low")]


class ToDo(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="Open")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="Medium")
    date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    reference_type = models.CharField(max_length=140, blank=True)  # e.g. "CRM Lead", "CRM Deal"
    reference_name = models.CharField(max_length=140, blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    allocated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="todos"
    )
    assignment_rule = models.ForeignKey(
        "core.AssignmentRule", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "todo"
        verbose_name = "ToDo"
        verbose_name_plural = "ToDos"

    def __str__(self):
        return self.description or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            import uuid

            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
