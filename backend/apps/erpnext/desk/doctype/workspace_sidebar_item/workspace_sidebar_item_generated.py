from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkspaceSidebarItemGenerated(FrappeChildModel):
    doctype = 'Workspace Sidebar Item'
    type = models.CharField(max_length=140, blank=True, null=True, default='Link')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    link_type = models.CharField(max_length=140, blank=True, null=True, default='DocType')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    child = models.SmallIntegerField(default=0)
    indent = models.SmallIntegerField(default=0)
    collapsible = models.SmallIntegerField(default=1)
    keep_closed = models.SmallIntegerField(default=0)
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    show_arrow = models.SmallIntegerField(default=0)
    filters = models.TextField(blank=True, null=True, default='')
    route_options = models.TextField(blank=True, null=True, default='')
    navigate_to_tab = models.CharField(max_length=140, blank=True, null=True, default='')
    open_in_new_tab = models.SmallIntegerField(default=1)
    default_workspace = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
