from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class FullAndFinalAssetGenerated(FrappeChildModel):
    doctype = 'Full and Final Asset'
    reference = models.CharField(max_length=140, blank=True, null=True, default='')
    status = models.CharField(max_length=140, blank=True, null=True, default='')
    description = models.TextField(blank=True, null=True, default='')
    asset_name = models.CharField(max_length=140, blank=True, null=True, default='')
    date = FrappeDateTimeField(null=True, blank=True)
    action = models.CharField(max_length=140, blank=True, null=True, default='Return')
    cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    account = models.CharField(max_length=140, blank=True, null=True, default='')
    actual_cost = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)

    class Meta:
        abstract = True
