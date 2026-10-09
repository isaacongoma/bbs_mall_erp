from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkspaceShortcutGenerated(FrappeChildModel):
    doctype = 'Workspace Shortcut'
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    doc_view = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_to_domain = models.CharField(max_length=140, blank=True, null=True, default='')
    stats_filter = models.TextField(blank=True, null=True, default='')
    color = models.CharField(max_length=140, blank=True, null=True, default='')
    format = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    kanban_board = models.CharField(max_length=140, blank=True, null=True, default='')
    report_ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
