from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeModel, FrappeTreeModel


class PortalUserGenerated(FrappeChildModel):
    doctype = 'Portal User'
    user = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
