# New infrastructure: Frappe's generic "File" doctype (frappe/core/doctype/file)
# has no equivalent in this port -- there was no file-storage/attachment
# subsystem here at all before. This is a minimal version covering what the
# frontend's upload_file RPC and FilesUploader components need: a stored file
# plus which doctype/record/field it's attached to.
from __future__ import annotations

from django.conf import settings
from django.db import models


class FileAttachment(models.Model):
    file_name = models.CharField(max_length=255)
    file = models.FileField(upload_to="uploads/%Y/%m/")
    is_private = models.BooleanField(default=True)
    folder = models.CharField(max_length=255, blank=True, default="Home")
    attached_to_doctype = models.CharField(max_length=140, blank=True)
    attached_to_name = models.CharField(max_length=140, blank=True)
    attached_to_field = models.CharField(max_length=140, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        db_table = "core_file_attachment"
        verbose_name = "File"

    def __str__(self):
        return self.file_name

    @property
    def file_url(self) -> str:
        return self.file.url if self.file else ""
