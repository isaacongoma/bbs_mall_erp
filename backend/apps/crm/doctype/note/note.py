# Ported from crm/fcrm/doctype/fcrm_note/{fcrm_note.json,fcrm_note.py} (frappe/crm, AGPL-3.0)
from django.conf import settings
from django.db import models

from apps.core.naming import make_autoname


class FCRMNote(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    title = models.CharField(max_length=140)
    content = models.TextField(blank=True)
    reference_doctype = models.CharField(max_length=140, default="CRM Lead", blank=True)
    reference_docname = models.CharField(max_length=140, blank=True)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "crm"
        db_table = "fcrm_note"
        verbose_name = "FCRM Note"
        ordering = ["-modified"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = make_autoname(type(self), "NOTE-")
        from apps.core.middleware import get_current_user

        user = get_current_user()
        if user and getattr(user, "is_authenticated", False) and self._state.adding:
            self.owner = user
        super().save(*args, **kwargs)
