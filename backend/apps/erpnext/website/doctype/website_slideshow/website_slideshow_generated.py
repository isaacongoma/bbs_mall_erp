from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteSlideshowGenerated(FrappeModel):
    doctype = 'Website Slideshow'
    slideshow_name = models.CharField(max_length=140, blank=True, null=True, default='')
    header = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
