from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PageGenerated(FrappeModel):
    doctype = 'Page'
    system_page = models.SmallIntegerField(default=0)
    page_name = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    type = models.CharField(max_length=140, blank=True, null=True, default='')
    island = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    restrict_to_domain = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
