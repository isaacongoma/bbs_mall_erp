from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class AssetMovementGenerated(FrappeModel):
    doctype = 'Asset Movement'
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    purpose = models.CharField(max_length=140, blank=True, null=True, default='')
    transaction_date = FrappeDateTimeField(null=True, blank=True)
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_name = models.CharField(max_length=140, blank=True, null=True, default='')
    amended_from = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
