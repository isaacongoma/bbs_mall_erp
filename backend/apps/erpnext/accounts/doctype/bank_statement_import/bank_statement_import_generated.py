from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BankStatementImportGenerated(FrappeModel):
    doctype = 'Bank Statement Import'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    bank_account = models.CharField(max_length=140, blank=True, null=True, default='')
    bank = models.CharField(max_length=140, blank=True, null=True, default='')
    import_file = models.TextField(blank=True, null=True, default='')
    template_options = models.TextField(blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='Pending')
    template_warnings = models.TextField(blank=True, null=True, default='')
    show_failed_logs = models.SmallIntegerField(default=0)
    google_sheets_url = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='Bank Transaction')
    import_type = models.CharField(max_length=140, blank=True, null=True, default='Insert New Records')
    submit_after_import = models.SmallIntegerField(default=1)
    mute_emails = models.SmallIntegerField(default=1)
    custom_delimiters = models.SmallIntegerField(default=0)
    delimiter_options = models.CharField(max_length=140, blank=True, null=True, default=',;\\t|')
    use_csv_sniffer = models.SmallIntegerField(default=0)
    import_mt940_fromat = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
