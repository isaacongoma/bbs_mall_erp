# Ported from crm/fcrm/doctype/crm_global_settings (frappe/crm, AGPL-3.0)
import uuid

from django.db import models

TYPE_CHOICES = [("Quick Filters", "Quick Filters"), ("Sidebar Items", "Sidebar Items")]


class CRMGlobalSettings(models.Model):
    name = models.CharField(max_length=32, primary_key=True, editable=False)  # autoname: hash
    dt = models.CharField(max_length=140)  # doctype label
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    json = models.TextField(blank=True)

    class Meta:
        app_label = "crm"
        db_table = "crm_global_settings"
        verbose_name = "CRM Global Settings"

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
