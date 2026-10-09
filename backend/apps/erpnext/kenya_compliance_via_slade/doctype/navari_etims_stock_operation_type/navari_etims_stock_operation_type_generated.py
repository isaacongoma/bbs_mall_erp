from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class NavariEtimsStockOperationTypeGenerated(FrappeModel):
    doctype = 'Navari eTims Stock Operation Type'
    operation_name = models.CharField(max_length=140, blank=True, null=True, default='')
    operation_type = models.CharField(max_length=140, blank=True, null=True, default='outgoing')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    settings = models.CharField(max_length=140, blank=True, null=True, default='')
    slade_id = models.CharField(max_length=140, blank=True, null=True, default='')
    source_location = models.CharField(max_length=140, blank=True, null=True, default='')
    destination_location = models.CharField(max_length=140, blank=True, null=True, default='')
    transit_location = models.CharField(max_length=140, blank=True, null=True, default='')
    active = models.SmallIntegerField(default=0)

    class Meta:
        abstract = True
