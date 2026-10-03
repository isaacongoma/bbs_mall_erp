# Ported from crm/fcrm/doctype/crm_fields_layout/crm_fields_layout.json (frappe/crm, AGPL-3.0)
from django.db import models

TYPE_CHOICES = [
    (t, t) for t in ("Quick Entry", "Side Panel", "Data Fields", "Grid Row", "Required Fields")
]


class CRMFieldsLayout(models.Model):
    doctype_label = "CRM Fields Layout"

    name = models.CharField(max_length=140, primary_key=True, editable=False)  # "{dt}-{type}"
    dt = models.CharField(max_length=140)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    layout = models.TextField(blank=True)  # JSON

    class Meta:
        app_label = "crm"
        db_table = "crm_fields_layout"
        verbose_name = "CRM Fields Layout"
        unique_together = [("dt", "type")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"{self.dt}-{self.type}"
        super().save(*args, **kwargs)
