from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomWorkspaceGenerated(FrappeModel):
    doctype = 'Custom Workspace'
    workspace = models.CharField(max_length=140, blank=True, null=True, default='')
    visibility = models.CharField(max_length=140, blank=True, null=True, default='Inherit')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    indicator_color = models.CharField(max_length=140, blank=True, null=True, default='')
    override_sequence = models.SmallIntegerField(default=0)
    sequence_id = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    content = models.TextField(blank=True, null=True, default='')
    widgets = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
