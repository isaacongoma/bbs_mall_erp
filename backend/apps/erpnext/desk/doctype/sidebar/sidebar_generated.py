from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SidebarGenerated(FrappeModel):
    doctype = 'Sidebar'
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    header_icon = models.CharField(max_length=140, blank=True, null=True, default='')
    app = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    merged_from = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
