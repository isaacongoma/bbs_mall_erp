# Ported from frappe/core/doctype/docshare/docshare.json (frappe/frappe, MIT)
from django.conf import settings
from django.db import models


class DocShare(models.Model):
    doctype = "DocShare"
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    share_doctype = models.CharField(max_length=140)  # e.g. "CRM Lead", "CRM Deal"
    share_name = models.CharField(max_length=140)
    read = models.BooleanField(default=False)
    write = models.BooleanField(default=False)
    share = models.BooleanField(default=False)
    submit = models.BooleanField(default=False)
    everyone = models.BooleanField(default=False)
    notify_by_email = models.BooleanField(default=True)
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        db_table = "docshare"
        verbose_name = "Document Share"

    def save(self, *args, **kwargs):
        if not self.name:
            import uuid

            self.name = uuid.uuid4().hex[:10]
        super().save(*args, **kwargs)
