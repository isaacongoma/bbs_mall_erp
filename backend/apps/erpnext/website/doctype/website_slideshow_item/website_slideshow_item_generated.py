from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteSlideshowItemGenerated(FrappeChildModel):
    doctype = 'Website Slideshow Item'
    image = models.TextField(blank=True, null=True, default='')
    heading = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
