from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class SidebarItemGroupGenerated(FrappeModel):
    doctype = 'Sidebar Item Group'
    sidebar = models.CharField(max_length=140, blank=True, null=True, default='')
    app = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
