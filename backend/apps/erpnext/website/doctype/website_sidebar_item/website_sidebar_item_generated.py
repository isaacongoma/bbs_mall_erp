from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WebsiteSidebarItemGenerated(FrappeChildModel):
    doctype = 'Website Sidebar Item'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    group = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
