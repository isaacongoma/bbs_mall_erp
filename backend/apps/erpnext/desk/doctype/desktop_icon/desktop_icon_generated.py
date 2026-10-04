from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class DesktopIconGenerated(FrappeModel):
    doctype = 'Desktop Icon'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    link = models.TextField(blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    idx = models.IntegerField(null=True, blank=True)
    logo_url = models.CharField(max_length=140, blank=True, null=True, default='')
    icon_type = models.CharField(max_length=140, blank=True, null=True, default='')
    app = models.CharField(max_length=140, blank=True, null=True, default='')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_icon = models.CharField(max_length=140, blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    link_type = models.CharField(max_length=140, blank=True, null=True, default='')
    sidebar = models.CharField(max_length=140, blank=True, null=True, default='')
    icon_image = models.TextField(blank=True, null=True, default='')
    restrict_removal = models.SmallIntegerField(default=0)
    bg_color = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
