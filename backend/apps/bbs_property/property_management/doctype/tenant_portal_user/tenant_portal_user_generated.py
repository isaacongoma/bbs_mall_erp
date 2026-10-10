from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class TenantPortalUserGenerated(FrappeChildModel):
    doctype = 'Tenant Portal User'
    user = models.CharField(max_length=140, blank=True, null=True, default='')
    full_name = models.CharField(max_length=140, blank=True, null=True, default='')
    access_level = models.CharField(max_length=140, blank=True, null=True, default='Owner')

    class Meta:
        abstract = True
