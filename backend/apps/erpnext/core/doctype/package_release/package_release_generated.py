from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PackageReleaseGenerated(FrappeModel):
    doctype = 'Package Release'
    package = models.CharField(max_length=140, blank=True, null=True, default='')
    major = models.IntegerField(null=True, blank=True)
    minor = models.IntegerField(null=True, blank=True)
    patch = models.IntegerField(null=True, blank=True)
    path = models.TextField(blank=True, null=True, default='')
    release_notes = models.TextField(blank=True, null=True, default='')
    publish = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
