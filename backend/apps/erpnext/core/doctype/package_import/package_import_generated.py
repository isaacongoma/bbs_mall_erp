from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackageImportGenerated(FrappeModel):
    doctype = 'Package Import'
    attach_package = models.TextField(blank=True, null=True, default='')
    activate = models.SmallIntegerField(default=0)
    log = models.TextField(blank=True, null=True, default='')
    force = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
