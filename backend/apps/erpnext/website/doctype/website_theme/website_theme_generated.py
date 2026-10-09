from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteThemeGenerated(FrappeModel):
    doctype = 'Website Theme'
    theme = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='Website')
    custom = models.SmallIntegerField(default=1)
    theme_scss = models.TextField(blank=True, null=True, default='')
    theme_url = models.CharField(max_length=140, blank=True, null=True, default='')
    js = models.TextField(blank=True, null=True, default='')
    google_font = models.CharField(max_length=140, blank=True, null=True, default='')
    font_size = models.CharField(max_length=140, blank=True, null=True, default='')
    primary_color = models.CharField(max_length=140, blank=True, null=True, default='')
    text_color = models.CharField(max_length=140, blank=True, null=True, default='')
    dark_color = models.CharField(max_length=140, blank=True, null=True, default='')
    background_color = models.CharField(max_length=140, blank=True, null=True, default='')
    custom_scss = models.TextField(blank=True, null=True, default='')
    light_color = models.CharField(max_length=140, blank=True, null=True, default='')
    font_properties = models.CharField(max_length=140, blank=True, null=True, default='wght@300;400;500;600;700;800')
    button_rounded_corners = models.SmallIntegerField(default=1)
    button_shadows = models.SmallIntegerField(default=0)
    button_gradients = models.SmallIntegerField(default=0)
    custom_overrides = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
