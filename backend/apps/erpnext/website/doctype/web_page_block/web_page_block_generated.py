from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebPageBlockGenerated(FrappeChildModel):
    doctype = 'Web Page Block'
    web_template = models.CharField(max_length=140, blank=True, null=True, default='')
    web_template_values = models.TextField(blank=True, null=True, default='')
    css_class = models.TextField(blank=True, null=True, default='')
    add_shade = models.SmallIntegerField(default=0)
    add_container = models.SmallIntegerField(default=1)
    hide_block = models.SmallIntegerField(default=0)
    add_top_padding = models.SmallIntegerField(default=1)
    add_bottom_padding = models.SmallIntegerField(default=1)
    add_border_at_top = models.SmallIntegerField(default=0)
    add_border_at_bottom = models.SmallIntegerField(default=0)
    add_background_image = models.SmallIntegerField(default=0)
    background_image = models.TextField(blank=True, null=True, default='')
    section_id = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
