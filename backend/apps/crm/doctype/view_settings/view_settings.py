# Ported from crm/fcrm/doctype/crm_view_settings (frappe/crm, AGPL-3.0)
# autoname is "autoincrement" in the original, but create()/create_or_update_standard_view()
# explicitly set doc.name = view.label (a Frappe quirk: explicit assignment bypasses
# autoname), so real rows are often label-keyed, not integer-keyed -- CharField
# accommodates both instead of forcing the rarer autoincrement path.
import time

from django.conf import settings
from django.db import models

TYPE_CHOICES = [("list", "list"), ("group_by", "group_by"), ("kanban", "kanban")]


class CRMViewSettings(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    label = models.CharField(max_length=140, blank=True)
    icon = models.CharField(max_length=140, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    is_standard = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default="list")
    dt = models.CharField(max_length=140)  # doctype label
    route_name = models.CharField(max_length=140, blank=True)
    pinned = models.BooleanField(default=False)
    public = models.BooleanField(default=False)
    filters = models.TextField(blank=True)  # JSON
    order_by = models.CharField(max_length=255, blank=True)
    load_default_columns = models.BooleanField(default=False)
    columns = models.TextField(blank=True)  # JSON
    rows = models.TextField(blank=True)  # JSON
    group_by_field = models.CharField(max_length=140, blank=True)
    column_field = models.CharField(max_length=140, blank=True)
    title_field = models.CharField(max_length=140, blank=True)
    kanban_columns = models.TextField(blank=True)  # JSON
    kanban_fields = models.TextField(blank=True)  # JSON

    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_view_settings"
        verbose_name = "CRM View Settings"
        ordering = ["-modified"]

    def __str__(self):
        return self.label or self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.label or str(int(time.time() * 1000))
        super().save(*args, **kwargs)
