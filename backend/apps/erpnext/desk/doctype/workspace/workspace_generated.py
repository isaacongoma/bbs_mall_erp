from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkspaceGenerated(FrappeModel):
    doctype = 'Workspace'
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_to_domain = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    for_user = models.CharField(max_length=140, blank=True, null=True, default='')
    hide_custom = models.SmallIntegerField(default=0)
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    public = models.SmallIntegerField(default=0)
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    parent_page = models.CharField(max_length=140, blank=True, null=True, default='')
    content = models.TextField(blank=True, null=True, default='[]')
    sequence_id = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    is_hidden = models.SmallIntegerField(default=0)
    indicator_color = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='Workspace')
    link_type = models.CharField(max_length=140, blank=True, null=True, default='')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    external_link = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    module_onboarding = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
