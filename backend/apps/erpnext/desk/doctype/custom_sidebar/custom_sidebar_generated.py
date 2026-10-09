from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class CustomSidebarGenerated(FrappeModel):
    doctype = 'Custom Sidebar'
    module = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    label = models.CharField(max_length=140, blank=True, null=True, default='')
    header_icon = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
