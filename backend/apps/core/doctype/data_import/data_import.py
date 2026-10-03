# Port of frappe/core/doctype/data_import (frappe/frappe, MIT): the import job record
# and its per-row log. Rows are parsed and created in importer.py.
import secrets

from django.db import models

STATUS_CHOICES = [
    ("Pending", "Pending"),
    ("Success", "Success"),
    ("Partial Success", "Partial Success"),
    ("Error", "Error"),
    ("Timed Out", "Timed Out"),
]

IMPORT_TYPE_CHOICES = [
    ("Insert New Records", "Insert New Records"),
    ("Update Existing Records", "Update Existing Records"),
]


class DataImport(models.Model):
    name = models.CharField(max_length=140, primary_key=True, editable=False)
    reference_doctype = models.CharField(max_length=140)
    import_type = models.CharField(max_length=30, choices=IMPORT_TYPE_CHOICES, default="Insert New Records")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    import_file = models.TextField(blank=True)
    google_sheets_url = models.TextField(blank=True)
    template_options = models.TextField(blank=True)
    mute_emails = models.BooleanField(default=True)
    creation = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "core"
        db_table = "data_import"
        verbose_name = "Data Import"
        ordering = ["-modified"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = "DI-" + secrets.token_hex(5)
        super().save(*args, **kwargs)


class DataImportLog(models.Model):
    data_import = models.ForeignKey(DataImport, on_delete=models.CASCADE, related_name="logs")
    log_index = models.PositiveIntegerField(default=0)
    success = models.BooleanField(default=False)
    docname = models.CharField(max_length=140, blank=True)
    messages = models.TextField(blank=True)
    exception = models.TextField(blank=True)
    row_indexes = models.TextField(blank=True)
    creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "core"
        db_table = "data_import_log"
        verbose_name = "Data Import Log"
        ordering = ["log_index"]
