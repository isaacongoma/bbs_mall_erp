# Port of frappe's Email Template doctype (frappe/frappe, MIT) with the CRM-specific `reference_doctype` link.
from django.conf import settings
from django.db import models


class EmailTemplate(models.Model):
    name = models.CharField(max_length=140, unique=True)
    enabled = models.BooleanField(default=False)
    reference_doctype = models.CharField(max_length=140, blank=True)
    subject = models.CharField(max_length=255, blank=True)
    use_html = models.BooleanField(default=False)
    response = models.TextField(blank=True)
    response_html = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+", editable=False
    )
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "core_email_template"
        verbose_name = "Email Template"
        ordering = ["-modified"]

    def __str__(self):
        return self.name
