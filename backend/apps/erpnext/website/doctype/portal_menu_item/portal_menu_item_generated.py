from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PortalMenuItemGenerated(FrappeChildModel):
    doctype = 'Portal Menu Item'
    title = models.CharField(max_length=140, blank=True, null=True, default='')
    enabled = models.SmallIntegerField(default=0)
    route = models.CharField(max_length=140, blank=True, null=True, default='')
    reference_doctype = models.CharField(max_length=140, blank=True, null=True, default='')
    role = models.CharField(max_length=140, blank=True, null=True, default='')
    target = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
