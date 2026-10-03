# Ported from crm/fcrm/doctype/crm_form_script (frappe/crm, AGPL-3.0)
from django.db import models

VIEW_CHOICES = [("Form", "Form"), ("List", "List")]

DEFAULT_SCRIPT = "function setupForm({ doc }) {\n    return {\n        actions: [],\n    }\n}"


class CRMFormScript(models.Model):
    name = models.CharField(max_length=140, primary_key=True)  # autoname: prompt (user-supplied)
    dt = models.CharField(max_length=140)  # doctype label
    view = models.CharField(max_length=10, choices=VIEW_CHOICES, default="Form")
    enabled = models.BooleanField(default=False)
    is_standard = models.BooleanField(default=False)
    script = models.TextField(blank=True, default=DEFAULT_SCRIPT)

    class Meta:
        app_label = "crm"
        db_table = "crm_form_script"
        verbose_name = "CRM Form Script"

    def __str__(self):
        return self.name


def get_form_script(dt: str, view: str = "Form"):
    """Returns the enabled form script(s) for (dt, view), or None."""
    scripts = list(
        CRMFormScript.objects.filter(dt=dt, view=view, enabled=True).values_list("script", flat=True)
    )
    if not scripts:
        return None
    return scripts if len(scripts) > 1 else scripts[0]
