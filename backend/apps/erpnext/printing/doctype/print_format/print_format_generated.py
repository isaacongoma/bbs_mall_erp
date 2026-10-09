from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PrintFormatGenerated(FrappeModel):
    doctype = 'Print Format'
    doc_type = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    standard = models.CharField(max_length=140, blank=True, null=True, default='No')
    custom_format = models.SmallIntegerField(default=0)
    print_format_type = models.CharField(max_length=140, blank=True, null=True, default='Jinja')
    raw_printing = models.SmallIntegerField(default=0)
    html = models.TextField(blank=True, null=True, default='')
    raw_commands = models.TextField(blank=True, null=True, default='')
    align_labels_right = models.SmallIntegerField(default=0)
    show_section_headings = models.SmallIntegerField(default=0)
    line_breaks = models.SmallIntegerField(default=0)
    default_print_language = models.CharField(max_length=140, blank=True, null=True, default='')
    font = models.CharField(max_length=140, blank=True, null=True, default='')
    label_color = models.CharField(max_length=140, blank=True, null=True, default='')
    value_color = models.CharField(max_length=140, blank=True, null=True, default='')
    css = models.TextField(blank=True, null=True, default='')
    format_data = models.TextField(blank=True, null=True, default='')
    classic_format_data = models.TextField(blank=True, null=True, default='')
    print_format_builder = models.SmallIntegerField(default=0)
    absolute_value = models.SmallIntegerField(default=0)
    print_format_builder_beta = models.SmallIntegerField(default=0)
    margin_top = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    margin_bottom = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    margin_left = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    margin_right = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    font_size = models.IntegerField(null=True, blank=True)
    page_number = models.CharField(max_length=140, blank=True, null=True, default='Hide')
    show_label_colon = models.SmallIntegerField(default=0)
    pdf_generator = models.CharField(max_length=140, blank=True, null=True, default='wkhtmltopdf')
    print_format_for = models.CharField(max_length=140, blank=True, null=True, default='DocType')
    report = models.CharField(max_length=140, blank=True, null=True, default='')
    draft_data = models.TextField(blank=True, null=True, default='')
    published_on = FrappeDateTimeField(null=True, blank=True)
    published_by = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
