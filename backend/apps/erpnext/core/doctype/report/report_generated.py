from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class ReportGenerated(FrappeModel):
    doctype = 'Report'
    report_name = models.CharField(max_length=140, blank=True, null=True, default='')
    ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_report = models.CharField(max_length=140, blank=True, null=True, default='')
    is_standard = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    documentation_url = models.CharField(max_length=140, blank=True, null=True, default='')
    add_total_row = models.SmallIntegerField(default=0)
    report_type = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    query = models.TextField(blank=True, null=True, default='')
    javascript = models.TextField(blank=True, null=True, default='')
    json = models.TextField(blank=True, null=True, default='')
    prepared_report = models.SmallIntegerField(default=0)
    generate_csv = models.SmallIntegerField(default=0)
    report_script = models.TextField(blank=True, null=True, default='')
    timeout = models.IntegerField(null=True, blank=True)
    add_translate_data = models.SmallIntegerField(default=0)
    default_print_format = models.CharField(max_length=140, blank=True, null=True, default='')
    default_letter_head = models.CharField(max_length=140, blank=True, null=True, default='')
    disable_prepared_report_automation = models.SmallIntegerField(default=0)
    snapshot_report = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
