from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class DockGenerated(FrappeModel):
    doctype = 'Dock'
    app = models.CharField(max_length=140, blank=True, null=True, default='')
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    standard = models.SmallIntegerField(default=0)
    mount_on = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
