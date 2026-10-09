from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackageGenerated(FrappeModel):
    doctype = 'Package'
    readme = models.TextField(blank=True, null=True, default='')
    package_name = models.CharField(max_length=140, blank=True, null=True, default='')
    license_type = models.CharField(max_length=140, blank=True, null=True, default='')
    license = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
