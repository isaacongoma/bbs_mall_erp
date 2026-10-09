from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class PatchLogGenerated(FrappeModel):
    doctype = 'Patch Log'
    patch = models.TextField(blank=True, null=True, default='')
    skipped = models.SmallIntegerField(default=0)
    traceback = models.TextField(blank=True, null=True, default='')

    class Meta:
        abstract = True
