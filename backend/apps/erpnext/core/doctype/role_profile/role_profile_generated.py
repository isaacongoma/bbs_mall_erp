from django.db import models

from apps.frappe.model.base import FrappeChildModel, FrappeDateTimeField, FrappeModel, FrappeTimeField, FrappeTreeModel


class RoleProfileGenerated(FrappeModel):
    doctype = 'Role Profile'
    role_profile = models.CharField(max_length=140, blank=True, null=True, default='')

    class Meta:
        abstract = True
