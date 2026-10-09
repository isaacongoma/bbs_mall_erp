from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class BomWebsiteOperationGenerated(FrappeChildModel):
    doctype = 'BOM Website Operation'
    operation = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    time_in_mins = models.DecimalField(max_digits=21, decimal_places=9, null=True, blank=True)
    website_image = models.TextField(blank=True, null=True, default='')
    thumbnail = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
