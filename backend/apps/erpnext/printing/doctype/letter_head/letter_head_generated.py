from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class LetterHeadGenerated(FrappeModel):
    doctype = 'Letter Head'
    letter_head_name = models.CharField(max_length=140, blank=True, null=True, default='')
    source = models.CharField(max_length=140, blank=True, null=True, default='')
    disabled = models.SmallIntegerField(default=0)
    is_default = models.SmallIntegerField(default=0)
    image = models.TextField(blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='')
    footer = models.TextField(blank=True, null=True, default='')
    align = models.CharField(max_length=140, blank=True, null=True, default='Left')
    image_height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    image_width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    footer_image = models.TextField(blank=True, null=True, default='')
    footer_image_height = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    footer_image_width = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    footer_align = models.CharField(max_length=140, blank=True, null=True, default='')
    footer_source = models.CharField(max_length=140, blank=True, null=True, default='')
    header_script = models.TextField(blank=True, null=True, default='')
    footer_script = models.TextField(blank=True, null=True, default='')
    standard = models.CharField(max_length=140, blank=True, null=True, default='No')
    letter_head_for = models.CharField(max_length=140, blank=True, null=True, default='DocType')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    custom_css = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
