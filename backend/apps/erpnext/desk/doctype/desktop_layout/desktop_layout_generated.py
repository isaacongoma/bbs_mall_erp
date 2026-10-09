from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DesktopLayoutGenerated(FrappeModel):
    doctype = 'Desktop Layout'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    layout = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
