# Generic equivalent of Frappe's `_seen` field (doc.add_seen()) -- tracks
# which users have opened a document, for read/unread bolding in list views.
from django.conf import settings
from django.db import models


class SeenDocument(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    reference_doctype = models.CharField(max_length=140)
    reference_name = models.CharField(max_length=140)
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        db_table = "seen_document"
        verbose_name = "Seen Document"
        unique_together = [("user", "reference_doctype", "reference_name")]


def add_seen(user, doctype: str, name: str):
    SeenDocument.objects.get_or_create(user=user, reference_doctype=doctype, reference_name=name)
