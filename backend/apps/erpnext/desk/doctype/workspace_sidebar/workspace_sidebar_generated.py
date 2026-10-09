from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class WorkspaceSidebarGenerated(FrappeModel):
    doctype = 'Workspace Sidebar'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    header_icon = models.CharField(max_length=140, blank=True, null=True, default='')
    app = models.CharField(max_length=140, blank=True, null=True, default='')
    for_user = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.TextField(blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    module_onboarding = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
