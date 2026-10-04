from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DataImportGenerated(FrappeModel):
    doctype = 'Data Import'
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    import_type = models.CharField(max_length=140, blank=True, null=True, default='Insert New Records')
    import_file = models.TextField(blank=True, null=True, default='')
    template_options = models.TextField(blank=True, null=True, default='')
    tree_parent_overrides = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    template_warnings = models.TextField(blank=True, null=True, default='')
    submit_after_import = models.SmallIntegerField(default=0)
    mute_emails = models.SmallIntegerField(default=1)
    google_sheets_url = models.CharField(max_length=140, blank=True, null=True, default='')
    payload_count = models.IntegerField(null=True, blank=True)
    delimiter_options = models.CharField(max_length=140, blank=True, null=True, default=',;\\t|')
    custom_delimiters = models.SmallIntegerField(default=0)
    use_csv_sniffer = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
