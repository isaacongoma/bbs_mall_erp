from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class AssetMovementItemGenerated(FrappeChildModel):
    doctype = 'Asset Movement Item'
    asset = models.CharField(max_length=140, blank=True, null=True, default='')
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    source_location = models.CharField(max_length=140, blank=True, null=True, default='')
    target_location = models.CharField(max_length=140, blank=True, null=True, default='')
    from_employee = models.CharField(max_length=140, blank=True, null=True, default='')
    to_employee = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
