from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class EtimsSettingsOrganisationMappingGenerated(FrappeChildModel):
    doctype = 'eTims Settings Organisation Mapping'
    is_active = models.SmallIntegerField(default=1)
    company = models.CharField(max_length=140, blank=True, null=True, default='')
    cluster = models.CharField(max_length=140, blank=True, null=True, default='')
    organisation = models.CharField(max_length=140, blank=True, null=True, default='')
    cluster_name = models.CharField(max_length=140, blank=True, null=True, default='')
    branch = models.CharField(max_length=140, blank=True, null=True, default='')
    department = models.CharField(max_length=140, blank=True, null=True, default='')
    workstation = models.CharField(max_length=140, blank=True, null=True, default='')
    warehouse = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
