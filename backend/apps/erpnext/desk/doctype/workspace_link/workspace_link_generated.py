from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class WorkspaceLinkGenerated(FrappeChildModel):
    doctype = 'Workspace Link'
    type = models.CharField(max_length=140, blank=True, null=True, default='Link')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    hidden = models.SmallIntegerField(default=0)
    link_type = models.CharField(max_length=140, blank=True, null=True, default='')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    doctype_layout = models.CharField(max_length=140, blank=True, null=True, default='')
    dependencies = models.CharField(max_length=140, blank=True, null=True, default='')
    only_for = models.CharField(max_length=140, blank=True, null=True, default='')
    onboard = models.SmallIntegerField(default=0)
    is_query_report = models.SmallIntegerField(default=0)
    link_count = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True, null=True, default='')
    report_ref_doctype = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
