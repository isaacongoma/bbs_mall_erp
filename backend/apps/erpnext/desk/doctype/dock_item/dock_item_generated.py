from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DockItemGenerated(FrappeChildModel):
    doctype = 'Dock Item'
    link_type = models.CharField(max_length=140, blank=True, null=True, default='')
    link_to = models.CharField(max_length=140, blank=True, null=True, default='')
    url = models.CharField(max_length=140, blank=True, null=True, default='')
    icon = models.CharField(max_length=140, blank=True, null=True, default='')
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    added = models.SmallIntegerField(default=0)
    hidden = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
