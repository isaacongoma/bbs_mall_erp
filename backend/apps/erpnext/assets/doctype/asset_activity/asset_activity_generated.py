from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetActivityGenerated(FrappeModel):
    doctype = 'Asset Activity'
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    subject = models.TextField(blank=True, null=True, default='')
    date = FrappeDateTimeField(null=True, blank=True)
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
